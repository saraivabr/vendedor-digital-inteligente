/**
 * Test script for CRM modules
 * Run with: node tests/test-crm-modules.js
 */

import activities from '../src/crm/activities.js';
import tasks from '../src/crm/tasks.js';
import notes from '../src/crm/notes.js';
import db from '../src/database/db.js';

console.log('Testing CRM Modules...\n');

// Test Activities Manager
console.log('=== Testing Activities Manager ===');
try {
    // Create test contact first
    const contactId = `contact_${Date.now()}`;
    db.db.prepare(`
        INSERT INTO contacts (id, phone, name)
        VALUES (?, ?, ?)
    `).run(contactId, '+5511999999999', 'Test Contact');

    // Log a message activity
    const activity1 = activities.logMessage(
        contactId,
        null,
        'received',
        'Olá, tenho interesse no produto!',
        { sentiment: 'positive' }
    );
    console.log('✓ Message activity logged:', activity1.id);

    // Log a follow-up activity
    const activity2 = activities.logFollowUp(contactId, null, 'Primeira tentativa de contato', 1);
    console.log('✓ Follow-up activity logged:', activity2.id);

    // Get activities for contact
    const contactActivities = activities.getForContact(contactId);
    console.log(`✓ Retrieved ${contactActivities.length} activities for contact`);

    // Get recent activities
    const recentActivities = activities.getRecent({ limit: 5 });
    console.log(`✓ Retrieved ${recentActivities.length} recent activities`);

    // Get activity stats
    const stats = activities.getStats(7);
    console.log(`✓ Activity stats retrieved:`, stats.length > 0 ? `${stats.length} entries` : 'empty (new db)');

    console.log('✓ Activities Manager: ALL TESTS PASSED\n');
} catch (error) {
    console.error('✗ Activities Manager test failed:', error.message);
    process.exit(1);
}

// Test Tasks Manager
console.log('=== Testing Tasks Manager ===');
try {
    // Create test contact if not exists
    const contactId = `contact_${Date.now()}`;
    db.db.prepare(`
        INSERT INTO contacts (id, phone, name)
        VALUES (?, ?, ?)
    `).run(contactId, '+5511888888888', 'Test Contact 2');

    // Create a task
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const task1 = tasks.create({
        contact_id: contactId,
        title: 'Ligar para o cliente',
        description: 'Follow-up sobre proposta',
        priority: 'high',
        due_date: dueDate,
        due_time: '14:00'
    });
    console.log('✓ Task created:', task1.id);

    // Create a follow-up task
    const task2 = tasks.createFollowUp(contactId, null, dueDate, 'Verificar interesse');
    console.log('✓ Follow-up task created:', task2.id);

    // Update task
    const updated = tasks.update(task1.id, { status: 'in_progress' });
    console.log('✓ Task updated:', updated.status);

    // List tasks
    const taskList = tasks.list({ page: 1, limit: 10 });
    console.log(`✓ Task list retrieved: ${taskList.data.length} tasks, ${taskList.pagination.total} total`);

    // Get task stats
    const taskStats = tasks.getStats();
    console.log('✓ Task stats:', taskStats);

    // Complete task
    const completed = tasks.complete(task2.id);
    console.log('✓ Task completed:', completed.id);

    console.log('✓ Tasks Manager: ALL TESTS PASSED\n');
} catch (error) {
    console.error('✗ Tasks Manager test failed:', error.message);
    process.exit(1);
}

// Test Notes Manager
console.log('=== Testing Notes Manager ===');
try {
    // Create test contact if not exists
    const contactId = `contact_${Date.now()}`;
    db.db.prepare(`
        INSERT INTO contacts (id, phone, name)
        VALUES (?, ?, ?)
    `).run(contactId, '+5511777777777', 'Test Contact 3');

    // Create a note
    const note1 = notes.create({
        contact_id: contactId,
        content: 'Cliente demonstrou interesse em plano anual',
        is_pinned: false,
        created_by: 'test'
    });
    console.log('✓ Note created:', note1.id);

    // Create a pinned note
    const note2 = notes.create({
        contact_id: contactId,
        content: 'IMPORTANTE: Cliente tem orçamento limitado',
        is_pinned: true,
        created_by: 'test'
    });
    console.log('✓ Pinned note created:', note2.id);

    // Update note
    const updated = notes.update(note1.id, {
        content: 'Cliente demonstrou interesse em plano anual - atualizado'
    });
    console.log('✓ Note updated');

    // Get notes for contact
    const contactNotes = notes.getForContact(contactId);
    console.log(`✓ Retrieved ${contactNotes.length} notes for contact`);

    // Get pinned notes
    const pinnedNotes = notes.getPinnedForContact(contactId);
    console.log(`✓ Retrieved ${pinnedNotes.length} pinned notes`);

    // Toggle pin
    const toggled = notes.togglePin(note1.id);
    console.log('✓ Note pin toggled:', toggled.is_pinned);

    // Search notes
    const searchResults = notes.search('orçamento');
    console.log(`✓ Search found ${searchResults.length} notes`);

    console.log('✓ Notes Manager: ALL TESTS PASSED\n');
} catch (error) {
    console.error('✗ Notes Manager test failed:', error.message);
    process.exit(1);
}

console.log('===================================');
console.log('✓ ALL CRM MODULES TESTS PASSED');
console.log('===================================');
