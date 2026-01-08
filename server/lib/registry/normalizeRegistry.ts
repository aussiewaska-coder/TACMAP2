#!/usr/bin/env tsx
// Convert AU_TacMap_Master_Reference_Table XLSX to registry.json

import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { RegistryEntry } from './types.js';

const XLSX_PATH = path.join(process.cwd(), '*REF_DATA/EmergServe Dashboad/AU_TacMap_Master_Reference_Table_v7.xlsx');
const OUTPUT_PATH = path.join(process.cwd(), 'public/registry.json');

// Helper functions for mapping
function mapJurisdiction(jurisdiction: string): any {
    if (!jurisdiction) return 'AUS';
    if (jurisdiction.includes('NSW')) return 'NSW';
    if (jurisdiction.includes('VIC')) return 'VIC';
    if (jurisdiction.includes('QLD')) return 'QLD';
    if (jurisdiction.includes('WA')) return 'WA';
    if (jurisdiction.includes('SA')) return 'SA';
    if (jurisdiction.includes('TAS')) return 'TAS';
    if (jurisdiction.includes('NT')) return 'NT';
    if (jurisdiction.includes('ACT')) return 'ACT';
    return 'AUS';
}

function mapStreamType(streamType: string): any {
    if (!streamType || streamType === 'Unknown') return 'geojson';
    return streamType.toLowerCase();
}

async function convertXlsxToRegistry() {
    console.log('📋 Loading XLSX file...');

    // Read the XLSX file
    const fileBuffer = await fs.readFile(XLSX_PATH);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Get the first sheet (Master)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${rawData.length} rows in XLSX`);

    // Normalize to RegistryEntry format
    const registry: RegistryEntry[] = rawData.map((row: any) => {
        // Parse tags (pipe-separated string to array)
        const tags = row.tags ? row.tags.split('|').map((t: string) => t.trim()) : [];

        // Parse tracking_keys for aviation entries
        const trackingKeys = row.tracking_keys
            ? row.tracking_keys.split(',').map((k: string) => k.trim()).filter(Boolean)
            : undefined;

        // Extract registration and icao24 from name if not in dedicated columns
        let registration = row.registration || '';
        let icao24 = row.icao24 || '';

        // Try to extract from name field like "VH-85D (7CB07F)"
        if (!registration && row.name) {
            const regMatch = row.name.match(/([A-Z]{2}-[A-Z0-9]+)/);
            if (regMatch) registration = regMatch[1];
        }
        if (!icao24 && row.name) {
            const hexMatch = row.name.match(/\(([A-F0-9]{6})\)/i);
            if (hexMatch) icao24 = hexMatch[1].toLowerCase();
        }

        const entry: RegistryEntry = {
            source_id: row.item_id || '',
            category: row.category || 'Alerts',
            subcategory: row.subcategory || '',
            tags,
            jurisdiction_state: mapJurisdiction(row.jurisdiction),
            endpoint_url: row.endpoint_url || '',
            stream_type: mapStreamType(row.stream_type),
            format: row.format || '',
            access_level: row.access_level || 'Open',
            certainly_open: row.certainly_open === 1 || row.certainly_open === true,
            machine_readable: row.machine_readable === 1 || row.machine_readable === true,
        };

        // Add aviation-specific fields if present
        if (icao24) entry.icao24 = icao24;
        if (registration) entry.registration = registration;
        if (trackingKeys && trackingKeys.length > 0) entry.tracking_keys = trackingKeys;
        if (row.aircraft_type_guess) entry.aircraft_type = row.aircraft_type_guess;
        if (row.operator_guess) entry.operator = row.operator_guess;
        if (row.subcategory && row.category === 'Aviation') {
            entry.role = row.subcategory; // Use subcategory as role for aviation
        }

        return entry;
    });

    // Filter out invalid entries (missing required fields)
    // For aviation assets, endpoint_url may be empty (they're tracked via adsb.lol)
    const validRegistry = registry.filter(e => {
        if (!e.source_id || !e.category) return false;

        // Aviation assets don't need endpoint_url
        if (e.category === 'Aviation') return true;

        // Other categories need endpoint_url
        return !!e.endpoint_url;
    });

    console.log(`✅ Normalized ${validRegistry.length} valid entries`);

    // Write to public/registry.json
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(
        OUTPUT_PATH,
        JSON.stringify(validRegistry, null, 2),
        'utf-8'
    );

    console.log(`💾 Wrote registry to ${OUTPUT_PATH}`);

    // Print summary
    const categories = [...new Set(validRegistry.map(e => e.category))];
    console.log('\n📈 Summary:');
    categories.forEach(cat => {
        const count = validRegistry.filter(e => e.category === cat).length;
        console.log(`  - ${cat}: ${count} entries`);
    });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    convertXlsxToRegistry()
        .then(() => {
            console.log('\n✨ Registry conversion complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Conversion failed:', err);
            process.exit(1);
        });
}

export { convertXlsxToRegistry };
