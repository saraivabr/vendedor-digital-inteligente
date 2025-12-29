/**
 * Start All Services
 * Runs both WhatsApp bot and CRM API
 */

import 'dotenv/config';
import { mkdirSync, existsSync } from 'fs';

// Ensure data directory exists
if (!existsSync('./data')) {
    mkdirSync('./data', { recursive: true });
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🤖 VENDEDOR DIGITAL INTELIGENTE                       ║
║     + CRM Dashboard                                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// Start CRM API
import('./api/server.js').then(({ startServer }) => {
    startServer();
});

// Start WhatsApp Bot
import('./index.js');
