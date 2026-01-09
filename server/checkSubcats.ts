import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'env.local', override: true });

import { getDb } from './db.js';
import { emergencyRegistry } from '../drizzle/schema.js';

async function checkSubcats() {
    const db = await getDb();
    if (!db) {
        console.error('DB not available');
        return;
    }
    const rows = await db.select().from(emergencyRegistry);
    const subcats = [...new Set(rows.map(r => r.subcategory))].filter(Boolean);
    const categories = [...new Set(rows.map(r => r.category))].filter(Boolean);
    console.log('Categories:', categories);
    console.log('Subcategories:', subcats);
    process.exit(0);
}

checkSubcats();
