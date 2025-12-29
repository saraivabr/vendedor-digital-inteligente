/**
 * Route Verification Script
 * Verifies that all API routes can be imported successfully
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routes = [
    'activities',
    'auth',
    'contacts',
    'deals',
    'metrics',
    'notes',
    'pipeline',
    'tags',
    'tasks',
    'users'
];

console.log('=== Route Import Verification ===\n');

let allSuccess = true;

for (const route of routes) {
    try {
        const routePath = join(__dirname, 'src', 'api', 'routes', `${route}.js`);
        await import(routePath);
        console.log(`✓ ${route}.js - Import successful`);
    } catch (error) {
        console.error(`✗ ${route}.js - Import failed:`, error.message);
        allSuccess = false;
    }
}

console.log('\n=== Verification Complete ===');
if (allSuccess) {
    console.log('All routes imported successfully!');
    process.exit(0);
} else {
    console.error('Some routes failed to import.');
    process.exit(1);
}
