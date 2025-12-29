/**
 * CRM Module - Main Export
 * Centralizes all CRM functionality
 */

import contacts from './contacts.js';
import deals from './deals.js';
import activities from './activities.js';
import tasks from './tasks.js';
import notes from './notes.js';
import pipeline from './pipeline.js';
import metrics from './metrics.js';
import tags from './tags.js';
import users from './users.js';
import auth from './auth.js';
import permissions from './permissions.js';

// Initialize CRM
async function initialize() {
    console.log('🚀 Initializing CRM...');

    // Ensure admin user exists
    await users.ensureAdminExists();

    // Clean expired sessions
    const cleaned = auth.cleanExpiredSessions();
    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired sessions`);
    }

    console.log('✅ CRM initialized');
}

export {
    contacts,
    deals,
    activities,
    tasks,
    notes,
    pipeline,
    metrics,
    tags,
    users,
    auth,
    permissions,
    initialize
};

export default {
    contacts,
    deals,
    activities,
    tasks,
    notes,
    pipeline,
    metrics,
    tags,
    users,
    auth,
    permissions,
    initialize
};
