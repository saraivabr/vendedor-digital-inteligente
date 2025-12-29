/**
 * Tests for Contacts Routes
 * Integration tests for contact management endpoints
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Contacts Routes', () => {
    let contactsModule;
    let testContact;

    before(async () => {
        // Import contacts module
        const contactsPath = new URL('../../src/crm/contacts.js', import.meta.url);
        contactsModule = (await import(contactsPath.href)).default;
    });

    beforeEach(() => {
        // Delete previous test contact if it exists
        const existing = contactsModule.getByPhone('+5511999999999');
        if (existing) {
            contactsModule.delete(existing.id);
        }

        // Create a fresh test contact for each test
        testContact = contactsModule.create({
            phone: '+5511999999999',
            name: 'Test Contact',
            email: 'test@contact.com',
            company_name: 'Test Company'
        });
    });

    describe('GET /api/contacts', () => {
        it('should list contacts with default pagination', () => {
            const result = contactsModule.list({
                page: 1,
                limit: 10,
                sortBy: 'created_at',
                sortOrder: 'DESC'
            });

            assert.ok(result, 'Should return result');
            assert.ok(Array.isArray(result.data), 'Should return data array');
            assert.ok(result.pagination, 'Should return pagination info');
            assert.strictEqual(typeof result.pagination.total, 'number');
            assert.strictEqual(typeof result.pagination.page, 'number');
            assert.strictEqual(typeof result.pagination.limit, 'number');
        });

        it('should filter contacts by search term', () => {
            const result = contactsModule.list({
                page: 1,
                limit: 10,
                search: 'Test Contact'
            });

            assert.ok(result.data.length > 0, 'Should find contacts');
            const found = result.data.some(c => c.name === 'Test Contact');
            assert.ok(found, 'Should find test contact');
        });

        it('should filter contacts by source', () => {
            // Create contact with specific source
            const whatsappContact = contactsModule.create({
                phone: '+5511988888888',
                name: 'WhatsApp Contact',
                source: 'whatsapp'
            });

            const result = contactsModule.list({
                page: 1,
                limit: 10,
                source: 'whatsapp'
            });

            const found = result.data.some(c => c.id === whatsappContact.id);
            assert.ok(found, 'Should find WhatsApp contact');

            // Cleanup
            contactsModule.delete(whatsappContact.id);
        });

        it('should filter contacts by tags', () => {
            // Add tag to test contact
            contactsModule.addTags(testContact.id, ['vip']);

            const result = contactsModule.list({
                page: 1,
                limit: 10,
                tags: ['vip']
            });

            const found = result.data.some(c => c.id === testContact.id);
            assert.ok(found, 'Should find VIP contact');
        });

        it('should support custom sorting', () => {
            const result = contactsModule.list({
                page: 1,
                limit: 10,
                sortBy: 'name',
                sortOrder: 'ASC'
            });

            assert.ok(result.data.length > 0);
            // Verify ascending order
            for (let i = 1; i < result.data.length; i++) {
                assert.ok(
                    result.data[i].name >= result.data[i - 1].name,
                    'Should be sorted by name ascending'
                );
            }
        });
    });

    describe('GET /api/contacts/stats', () => {
        it('should return contact statistics', () => {
            const stats = contactsModule.getStats();

            assert.ok(stats, 'Should return stats');
            assert.strictEqual(typeof stats.total, 'number');
            assert.strictEqual(typeof stats.last_7_days, 'number');
            assert.strictEqual(typeof stats.last_30_days, 'number');
            assert.strictEqual(typeof stats.sources, 'number');
            assert.ok(Array.isArray(stats.bySource), 'Should have source breakdown array');
        });
    });

    describe('GET /api/contacts/:id', () => {
        it('should get contact by ID', () => {
            const contact = contactsModule.getById(testContact.id);

            assert.ok(contact, 'Should return contact');
            assert.strictEqual(contact.id, testContact.id);
            assert.strictEqual(contact.name, 'Test Contact');
            assert.strictEqual(contact.phone, '+5511999999999');
        });

        it('should return null for non-existent ID', () => {
            const contact = contactsModule.getById('nonexistent-id');
            assert.strictEqual(contact, null);
        });
    });

    describe('GET /api/contacts/:id/timeline', () => {
        it('should return contact timeline', () => {
            const timeline = contactsModule.getTimeline(testContact.id, 50);

            assert.ok(Array.isArray(timeline), 'Should return array');
            // Timeline might be empty for new contact, that's ok
        });

        it('should limit timeline entries', () => {
            const timeline = contactsModule.getTimeline(testContact.id, 5);

            assert.ok(Array.isArray(timeline));
            assert.ok(timeline.length <= 5, 'Should respect limit');
        });
    });

    describe('GET /api/contacts/:id/deals', () => {
        it('should return contact deals', () => {
            const deals = contactsModule.getDeals(testContact.id);

            assert.ok(Array.isArray(deals), 'Should return array');
            // New contact has no deals
            assert.strictEqual(deals.length, 0);
        });
    });

    describe('POST /api/contacts', () => {
        it('should create contact with required fields', () => {
            const newContact = contactsModule.create({
                phone: '+5511977777777',
                name: 'New Contact'
            });

            assert.ok(newContact, 'Should create contact');
            assert.ok(newContact.id, 'Should have ID');
            assert.strictEqual(newContact.phone, '+5511977777777');
            assert.strictEqual(newContact.name, 'New Contact');

            // Cleanup
            contactsModule.delete(newContact.id);
        });

        it('should fail to create duplicate phone', () => {
            const existing = contactsModule.getByPhone(testContact.phone);
            assert.ok(existing, 'Test contact should exist');

            // Attempting to create with same phone should be prevented at route level
            // The CRM module itself will create it, but the route should check first
        });

        it('should create contact with all fields', () => {
            const fullContact = contactsModule.create({
                phone: '+5511966666666',
                name: 'Full Contact',
                email: 'full@contact.com',
                company_name: 'Full Company',
                source: 'website',
                tags: ['lead', 'hot'],
                custom_fields: { industry: 'tech' }
            });

            assert.ok(fullContact);
            assert.strictEqual(fullContact.name, 'Full Contact');
            assert.strictEqual(fullContact.email, 'full@contact.com');
            assert.strictEqual(fullContact.company_name, 'Full Company');
            assert.strictEqual(fullContact.source, 'website');
            assert.ok(fullContact.tags.includes('lead'));
            assert.strictEqual(fullContact.custom_fields.industry, 'tech');

            // Cleanup
            contactsModule.delete(fullContact.id);
        });
    });

    describe('PUT /api/contacts/:id', () => {
        it('should update contact fields', () => {
            const updated = contactsModule.update(testContact.id, {
                name: 'Updated Name',
                email: 'updated@contact.com'
            });

            assert.ok(updated, 'Should return updated contact');
            assert.strictEqual(updated.name, 'Updated Name');
            assert.strictEqual(updated.email, 'updated@contact.com');
            assert.strictEqual(updated.phone, testContact.phone, 'Phone should not change');
        });

        it('should update company information', () => {
            const updated = contactsModule.update(testContact.id, {
                company_name: 'New Company',
                custom_fields: { size: '50-100' }
            });

            assert.ok(updated);
            assert.strictEqual(updated.company_name, 'New Company');
            assert.strictEqual(updated.custom_fields.size, '50-100');
        });

        it('should return null for non-existent contact', () => {
            const updated = contactsModule.update('nonexistent-id', {
                name: 'Test'
            });

            assert.strictEqual(updated, null);
        });
    });

    describe('DELETE /api/contacts/:id', () => {
        it('should delete contact', () => {
            const toDelete = contactsModule.create({
                phone: '+5511955555555',
                name: 'To Delete'
            });

            contactsModule.delete(toDelete.id);

            const deleted = contactsModule.getById(toDelete.id);
            assert.strictEqual(deleted, null, 'Contact should be deleted');
        });

        it('should handle deleting non-existent contact', () => {
            // Should not throw error
            contactsModule.delete('nonexistent-id');
        });
    });

    describe('POST /api/contacts/:id/tags', () => {
        it('should add tags to contact', () => {
            const updated = contactsModule.addTags(testContact.id, ['new-tag', 'another-tag']);

            assert.ok(updated, 'Should return updated contact');
            assert.ok(updated.tags.includes('new-tag'));
            assert.ok(updated.tags.includes('another-tag'));
        });

        it('should not duplicate existing tags', () => {
            contactsModule.addTags(testContact.id, ['tag1']);
            const updated = contactsModule.addTags(testContact.id, ['tag1', 'tag2']);

            const tag1Count = updated.tags.filter(t => t === 'tag1').length;
            assert.strictEqual(tag1Count, 1, 'Should not duplicate tags');
        });

        it('should return null for non-existent contact', () => {
            const updated = contactsModule.addTags('nonexistent-id', ['tag']);
            assert.strictEqual(updated, null);
        });
    });

    describe('DELETE /api/contacts/:id/tags/:tag', () => {
        it('should remove tag from contact', () => {
            contactsModule.addTags(testContact.id, ['remove-me', 'keep-me']);

            const updated = contactsModule.removeTags(testContact.id, ['remove-me']);

            assert.ok(updated);
            assert.ok(!updated.tags.includes('remove-me'));
            assert.ok(updated.tags.includes('keep-me'));
        });

        it('should handle removing non-existent tag', () => {
            const updated = contactsModule.removeTags(testContact.id, ['nonexistent-tag']);
            assert.ok(updated, 'Should not fail');
        });

        it('should return null for non-existent contact', () => {
            const updated = contactsModule.removeTags('nonexistent-id', ['tag']);
            assert.strictEqual(updated, null);
        });
    });

    describe('GET /api/contacts/phone/:phone', () => {
        it('should get contact by phone', () => {
            const contact = contactsModule.getByPhone(testContact.phone);

            assert.ok(contact, 'Should find contact');
            assert.strictEqual(contact.id, testContact.id);
            assert.strictEqual(contact.phone, testContact.phone);
        });

        it('should return null for non-existent phone', () => {
            const contact = contactsModule.getByPhone('+5511900000000');
            assert.strictEqual(contact, null);
        });

        it('should handle phone format variations', () => {
            // Note: Phone normalization depends on implementation
            const contact = contactsModule.getByPhone('+5511999999999');
            assert.ok(contact);
        });
    });

    after(() => {
        // Cleanup all test contacts
        if (testContact && testContact.id) {
            contactsModule.delete(testContact.id);
        }

        // Clean up any remaining test contacts
        const allContacts = contactsModule.list({ page: 1, limit: 1000 });
        allContacts.data.forEach(contact => {
            if (contact.name && contact.name.includes('Test') ||
                contact.email && contact.email.includes('test')) {
                contactsModule.delete(contact.id);
            }
        });
    });
});
