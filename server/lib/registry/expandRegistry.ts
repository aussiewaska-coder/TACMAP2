// server/lib/registry/expandRegistry.ts
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'env.local', override: true });

import { getDb } from '../../db.js';
import { emergencyRegistry } from '../../../drizzle/schema.js';
import { sql } from 'drizzle-orm';

const NEW_SOURCES = [
    {
        sourceId: 'VIC-EMV-ALERTS-GEOJSON',
        category: 'Alerts',
        subcategory: 'State Fire Alerts',
        tags: ['alerts', 'fire', 'bushfire', 'vic', 'cap-au', 'geojson', 'rss', 'public_warning'],
        jurisdictionState: 'VIC',
        endpointUrl: 'https://emergency.vic.gov.au/public/events-geojson.json',
        streamType: 'geojson',
        format: 'GeoJSON',
        accessLevel: 'Open',
        certainlyOpen: true,
        machineReadable: true,
    },
    {
        sourceId: 'VIC-CFA-FIRE-DANGER',
        category: 'Alerts',
        subcategory: 'Fire Danger & Restrictions',
        tags: ['fire_danger', 'total_fire_ban', 'vic', 'alerts', 'restrictions', 'public_warning'],
        jurisdictionState: 'VIC',
        endpointUrl: 'https://www.cfa.vic.gov.au/api/data/v1/fdr_totalfirebans.json',
        streamType: 'json',
        format: 'JSON',
        accessLevel: 'Open',
        certainlyOpen: true,
        machineReadable: true,
    },
    {
        sourceId: 'QLD-QFES-BUSHFIRE-CAPAU',
        category: 'Alerts',
        subcategory: 'State Fire Alerts',
        tags: ['alerts', 'fire', 'bushfire', 'qld', 'cap-au', 'xml', 'public_warning'],
        jurisdictionState: 'QLD',
        endpointUrl: 'https://publiccontent-gis-psba-qld-gov-au.s3.amazonaws.com/content/Feeds/BushfireCurrentIncidents/bushfireAlert_capau.xml',
        streamType: 'cap',
        format: 'CAP-AU',
        accessLevel: 'Open',
        certainlyOpen: true,
        machineReadable: true,
    },
    {
        sourceId: 'QLD-QFES-BUSHFIRE-XML',
        category: 'Alerts',
        subcategory: 'State Fire Alerts',
        tags: ['alerts', 'fire', 'bushfire', 'qld', 'rss', 'xml', 'public_warning'],
        jurisdictionState: 'QLD',
        endpointUrl: 'https://publiccontent-gis-psba-qld-gov-au.s3.amazonaws.com/content/Feeds/BushfireCurrentIncidents/bushfireAlert.xml',
        streamType: 'rss',
        format: 'RSS',
        accessLevel: 'Open',
        certainlyOpen: true,
        machineReadable: true,
    },
    {
        sourceId: 'QLD-DISASTER-INCIDENTS',
        category: 'Alerts',
        subcategory: 'Incident Dashboard',
        tags: ['alerts', 'qld', 'fire', 'incident_dashboard', 'disaster', 'public_warning'],
        jurisdictionState: 'QLD',
        endpointUrl: 'https://disaster.qld.gov.au/api/v1/incidents', // Tentative
        streamType: 'json',
        format: 'JSON',
        accessLevel: 'Open',
        certainlyOpen: false,
        machineReadable: true,
    },
    {
        sourceId: 'VIC-FFMV-ACTIVE-FIRE',
        category: 'Fire',
        subcategory: 'Operational Fire Ground',
        tags: ['fire', 'bushfire', 'vic', 'ffm', 'operational', 'fire_ground_truth'],
        jurisdictionState: 'VIC',
        endpointUrl: 'https://services.land.vic.gov.au/arcgis/rest/services/GBench/FireHistory/MapServer/0/query?where=1%3D1&outFields=*&f=geojson',
        streamType: 'geojson',
        format: 'GeoJSON',
        accessLevel: 'Open',
        certainlyOpen: true,
        machineReadable: true,
    },
    {
        sourceId: 'QLD-DES-PARK-ALERTS',
        category: 'Alerts',
        subcategory: 'Situation Reports',
        tags: ['alerts', 'qld', 'park', 'situation_report', 'public_warning'],
        jurisdictionState: 'QLD',
        endpointUrl: 'https://www.des.qld.gov.au/xml/rss/alerts/all.xml',
        streamType: 'rss',
        format: 'RSS',
        accessLevel: 'Open',
        certainlyOpen: true,
        machineReadable: true,
    }
];

async function expandRegistry() {
    console.log('🚀 Starting registry expansion...');
    const db = await getDb();
    if (!db) {
        console.error('❌ Database not available');
        return;
    }

    let inserted = 0;
    let updated = 0;

    for (const source of NEW_SOURCES) {
        try {
            await db.insert(emergencyRegistry)
                .values({
                    ...source,
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: emergencyRegistry.sourceId,
                    set: {
                        category: source.category as any,
                        subcategory: source.subcategory,
                        tags: source.tags,
                        jurisdictionState: source.jurisdictionState as any,
                        endpointUrl: source.endpointUrl,
                        streamType: source.streamType as any,
                        format: source.format,
                        accessLevel: source.accessLevel as any,
                        certainlyOpen: source.certainlyOpen,
                        machineReadable: source.machineReadable,
                        updatedAt: new Date(),
                    }
                });
            console.log(`✅ Upserted ${source.sourceId}`);
            inserted++;
        } catch (error) {
            console.error(`❌ Failed to upsert ${source.sourceId}:`, error);
        }
    }

    console.log(`🏁 Expansion complete. ${inserted} sources processed.`);
}

expandRegistry();
