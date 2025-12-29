/**
 * Test Database Setup
 * Creates an isolated in-memory database for testing
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createTestDb() {
    // Use in-memory database for tests
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    // Load schemas
    const schema = readFileSync(join(__dirname, '../src/database/schema.sql'), 'utf-8');
    db.exec(schema);

    const crmSchema = readFileSync(join(__dirname, '../src/database/crm-schema.sql'), 'utf-8');
    db.exec(crmSchema);

    return db;
}

export function resetTestDb(db) {
    // Clear all data but keep schema
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

    // Delete in correct order to respect foreign keys
    const deleteOrder = ['activities', 'deals', 'contacts', 'tasks', 'notes', 'sessions', 'users', 'permissions', 'tags', 'daily_metrics', 'pipeline_stages'];

    for (const tableName of deleteOrder) {
        try {
            db.prepare(`DELETE FROM ${tableName}`).run();
        } catch (err) {
            // Table might not exist or have dependencies
        }
    }

    // Re-insert default data (pipeline stages and permissions)
    const crmSchema = readFileSync(join(__dirname, '../src/database/crm-schema.sql'), 'utf-8');

    // Extract INSERT statements using regex
    const insertRegex = /INSERT OR IGNORE INTO[\s\S]*?;/g;
    const inserts = crmSchema.match(insertRegex);

    if (inserts) {
        for (const insert of inserts) {
            try {
                db.exec(insert);
            } catch (err) {
                // Ignore if already inserted or error
                console.error('Error inserting:', err.message);
            }
        }
    }
}
