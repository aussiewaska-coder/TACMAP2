// Import emergency registry data from Excel to database

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'env.local', override: true });

import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { getDb } from '../../db.js';
import { emergencyRegistry } from '../../../drizzle/schema.js';
import { sql } from 'drizzle-orm';

const XLSX_PATH = '*REF_DATA/EmergServe Dashboad/AU_TacMap_Master_Reference_Table_v7.xlsx';

async function importRegistry() {
    console.log('📋 Loading XLSX file...');

    try {
        const fileBuffer = await readFile(XLSX_PATH);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        console.log(`📊 Found ${rawData.length} rows in Excel`);

        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        const entries = rawData
            .filter(row => {
                const url = String(row.endpoint_url || '');
                const hasUrl = url.startsWith('http') && !url.includes('sample file');
                return row.item_id && (hasUrl || row.category === 'Aviation');
            })
            .map(row => {
                // Parse tags
                const tags = row.tags ? String(row.tags).split('|').map((t: string) => t.trim()) : [];

                // Parse tracking keys
                const trackingKeys = row.tracking_keys
                    ? String(row.tracking_keys).split(',').map((k: string) => k.trim()).filter(Boolean)
                    : null;

                // Extract registration and icao24
                let registration = row.registration || '';
                let icao24 = row.icao24 || '';

                if (!registration && row.name) {
                    const regMatch = String(row.name).match(/([A-Z]{2}-[A-Z0-9]+)/);
                    if (regMatch) registration = regMatch[1];
                }
                if (!icao24 && row.name) {
                    const hexMatch = String(row.name).match(/\(([A-F0-9]{6})\)/i);
                    if (hexMatch) icao24 = hexMatch[1].toLowerCase();
                }

                return {
                    sourceId: String(row.item_id || ''),
                    category: String(row.category || 'Alerts'),
                    subcategory: String(row.subcategory || ''),
                    tags,
                    jurisdictionState: String(row.jurisdiction || 'AUS'),
                    endpointUrl: String(row.endpoint_url || ''),
                    streamType: (() => {
                        const s = String(row.stream_type || '').toLowerCase();
                        if (s.includes('geojson') || s.includes('json')) return 'geojson';
                        if (s.includes('rss') || s === 'xml') return 'rss';
                        if (s.includes('cap')) return 'cap';
                        if (s.includes('arcgis') || s.includes('feature service')) return 'arcgis';
                        return s;
                    })(),
                    format: String(row.format || ''),
                    accessLevel: String(row.access_level || 'Open'),
                    certainlyOpen: row.certainly_open === 1 || row.certainly_open === true || String(row.certainly_open).toLowerCase() === 'yes',
                    machineReadable: row.machine_readable === 1 || row.machine_readable === true || String(row.machine_readable).toLowerCase() === 'yes',

                    // Aviation fields
                    icao24: icao24 || null,
                    registration: registration || null,
                    trackingKeys,
                    aircraftType: row.aircraft_type_guess ? String(row.aircraft_type_guess) : null,
                    operator: row.operator_guess ? String(row.operator_guess) : null,
                    role: row.category === 'Aviation' && row.subcategory ? String(row.subcategory) : null,
                };
            });

        console.log(`✅ Parsed ${entries.length} valid entries`);
        console.log('🧹 Cleaning old registry entries...');
        await db.delete(emergencyRegistry);

        console.log('💾 Importing to database...');

        // Insert in batches
        const batchSize = 50;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            await db.insert(emergencyRegistry)
                .values(batch)
                .onConflictDoUpdate({
                    target: emergencyRegistry.sourceId,
                    set: {
                        category: sql`excluded.category` as any,
                        subcategory: sql`excluded.subcategory` as any,
                        tags: sql`excluded.tags` as any,
                        jurisdictionState: sql`excluded.jurisdiction_state` as any,
                        endpointUrl: sql`excluded.endpoint_url` as any,
                        streamType: sql`excluded.stream_type` as any,
                        format: sql`excluded.format` as any,
                        accessLevel: sql`excluded.access_level` as any,
                        certainlyOpen: sql`excluded.certainly_open` as any,
                        machineReadable: sql`excluded.machine_readable` as any,
                        icao24: sql`excluded.icao24` as any,
                        registration: sql`excluded.registration` as any,
                        trackingKeys: sql`excluded.tracking_keys` as any,
                        aircraftType: sql`excluded.aircraft_type` as any,
                        operator: sql`excluded.operator` as any,
                        role: sql`excluded.role` as any,
                        updatedAt: new Date(),
                    },
                });
            console.log(`  Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`);
        }

        console.log('✅ Import complete!');
        console.log(`📊 Total entries in database: ${entries.length}`);

    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

importRegistry();
