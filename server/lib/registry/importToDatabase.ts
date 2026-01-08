// Import emergency registry data from Excel to database

import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';
import { getDb } from '../db.js';
import { emergencyRegistry } from '../../drizzle/schema.js';

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
            .filter(row => row['Source ID'] && row['Endpoint URL'])
            .map(row => ({
                sourceId: String(row['Source ID'] || ''),
                category: String(row['Category'] || ''),
                subcategory: String(row['Subcategory'] || ''),
                tags: row['Tags'] ? String(row['Tags']).split(',').map((t: string) => t.trim()) : [],
                jurisdictionState: String(row['Jurisdiction (State)'] || 'AUS'),
                endpointUrl: String(row['Endpoint URL'] || ''),
                streamType: String(row['Stream Type'] || ''),
                format: String(row['Format'] || ''),
                accessLevel: String(row['Access Level'] || ''),
                certainlyOpen: row['Certainly Open?'] === 'Yes',
                machineReadable: row['Machine Readable?'] === 'Yes',

                // Aviation fields
                icao24: row['ICAO24'] ? String(row['ICAO24']) : null,
                registration: row['Registration'] ? String(row['Registration']) : null,
                trackingKeys: row['Tracking Keys'] ? String(row['Tracking Keys']).split(',').map((k: string) => k.trim()) : null,
                aircraftType: row['Aircraft Type'] ? String(row['Aircraft Type']) : null,
                operator: row['Operator'] ? String(row['Operator']) : null,
                role: row['Role'] ? String(row['Role']) : null,
            }));

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
