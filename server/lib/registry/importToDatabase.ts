// Import emergency registry data from Excel to database

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'env.local', override: true });

import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { getDb } from '../../db.js';
import { emergencyRegistry } from '../../../drizzle/schema.js';

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
            .filter(row => row.item_id && (row.endpoint_url || row.category === 'Aviation'))
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
                    streamType: String(row.stream_type || ''),
                    format: String(row.format || ''),
                    accessLevel: String(row.access_level || 'Open'),
                    certainlyOpen: row.certainly_open === 1 || row.certainly_open === true,
                    machineReadable: row.machine_readable === 1 || row.machine_readable === true,

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
                        category: batch[0].category,
                        subcategory: batch[0].subcategory,
                        tags: batch[0].tags,
                        jurisdictionState: batch[0].jurisdictionState,
                        endpointUrl: batch[0].endpointUrl,
                        streamType: batch[0].streamType,
                        format: batch[0].format,
                        accessLevel: batch[0].accessLevel,
                        certainlyOpen: batch[0].certainlyOpen,
                        machineReadable: batch[0].machineReadable,
                        icao24: batch[0].icao24,
                        registration: batch[0].registration,
                        trackingKeys: batch[0].trackingKeys,
                        aircraftType: batch[0].aircraftType,
                        operator: batch[0].operator,
                        role: batch[0].role,
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
