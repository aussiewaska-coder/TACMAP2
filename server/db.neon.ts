import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema.pg';

/**
 * Neon DB helper for PostgreSQL
 * 
 * To use: 
 * 1. Set DATABASE_URL in your .env to your Neon connection string
 * 2. This helper uses the neon-http adapter for serverless compatibility
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getNeonDb() {
    if (!_db && process.env.DATABASE_URL) {
        try {
            const sql = neon(process.env.DATABASE_URL);
            _db = drizzle(sql, { schema });
            console.log("[Database] Connected to Neon PostgreSQL");
        } catch (error) {
            console.warn("[Database] Failed to connect to Neon:", error);
            _db = null;
        }
    }
    return _db;
}

// Export the postgres schema
export { schema as pgSchema };
