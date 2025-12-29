/**
 * Tests for Contacts Manager
 * Comprehensive test suite for CRM contact operations
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createTestDb, resetTestDb } from '../setup-test-db.js';
import { ContactsManager } from '../../src/crm/contacts.js';

// Create test database and managers
const testDb = createTestDb();
const contacts = new ContactsManager(testDb);

describe('ContactsManager', () => {
    let testContact;

    before(() => {
        // Reset database once before all tests
        resetTestDb(testDb);
    });

    describe('create()', () => {
        it('should create a new contact with required fields', () => {
            testContact = contacts.create({
                phone: '+5511999999999',
                name: 'João Silva',
                email: 'joao@example.com'
            });

            assert.ok(testContact);
            assert.ok(testContact.id);
            assert.strictEqual(testContact.phone, '+5511999999999');
            assert.strictEqual(testContact.name, 'João Silva');
            assert.strictEqual(testContact.email, 'joao@example.com');
            assert.ok(Array.isArray(testContact.tags));
            assert.ok(typeof testContact.custom_fields === 'object');
        });

        it('should create contact with company info', () => {
            const contact = contacts.create({
                phone: '+5511888888888',
                name: 'Maria Santos',
                company_name: 'Tech Corp',
                company_size: 'medium',
                industry: 'technology',
                position: 'CEO'
            });

            assert.strictEqual(contact.company_name, 'Tech Corp');
            assert.strictEqual(contact.company_size, 'medium');
            assert.strictEqual(contact.industry, 'technology');
            assert.strictEqual(contact.position, 'CEO');
        });

        it('should create contact with tags and custom fields', () => {
            const contact = contacts.create({
                phone: '+5511777777777',
                name: 'Pedro Alves',
                tags: ['vip', 'hot-lead'],
                custom_fields: { budget: 50000, timeline: '30 days' }
            });

            assert.deepStrictEqual(contact.tags, ['vip', 'hot-lead']);
            assert.deepStrictEqual(contact.custom_fields, { budget: 50000, timeline: '30 days' });
        });
    });

    describe('getById()', () => {
        it('should retrieve contact by ID', () => {
            const contact = contacts.getById(testContact.id);
            assert.ok(contact);
            assert.strictEqual(contact.id, testContact.id);
            assert.strictEqual(contact.phone, testContact.phone);
        });

        it('should return null for non-existent ID', () => {
            const contact = contacts.getById('non-existent-id');
            assert.strictEqual(contact, null);
        });
    });

    describe('getByPhone()', () => {
        it('should retrieve contact by phone', () => {
            const contact = contacts.getByPhone('+5511999999999');
            assert.ok(contact);
            assert.strictEqual(contact.phone, '+5511999999999');
            assert.strictEqual(contact.name, 'João Silva');
        });

        it('should return null for non-existent phone', () => {
            const contact = contacts.getByPhone('+5511000000000');
            assert.strictEqual(contact, null);
        });
    });

    describe('update()', () => {
        it('should update contact fields', () => {
            const updated = contacts.update(testContact.id, {
                name: 'João Silva Updated',
                city: 'São Paulo',
                state: 'SP'
            });

            assert.ok(updated);
            assert.strictEqual(updated.name, 'João Silva Updated');
            assert.strictEqual(updated.city, 'São Paulo');
            assert.strictEqual(updated.state, 'SP');
        });

        it('should update tags', () => {
            const updated = contacts.update(testContact.id, {
                tags: ['customer', 'priority']
            });

            assert.deepStrictEqual(updated.tags, ['customer', 'priority']);
        });

        it('should update custom fields', () => {
            const updated = contacts.update(testContact.id, {
                custom_fields: { source: 'linkedin', score: 85 }
            });

            assert.deepStrictEqual(updated.custom_fields, { source: 'linkedin', score: 85 });
        });

        it('should return null for non-existent contact', () => {
            const updated = contacts.update('non-existent-id', { name: 'Test' });
            assert.strictEqual(updated, null);
        });
    });

    describe('list()', () => {
        before(() => {
            // Create additional contacts for listing tests
            contacts.create({ phone: '+5511666666666', name: 'Ana Costa', source: 'website' });
            contacts.create({ phone: '+5511555555555', name: 'Carlos Mendes', source: 'referral' });
        });

        it('should list all contacts with pagination', () => {
            const result = contacts.list({ page: 1, limit: 10 });

            assert.ok(result.data);
            assert.ok(Array.isArray(result.data));
            assert.ok(result.data.length > 0);
            assert.ok(result.pagination);
            assert.strictEqual(result.pagination.page, 1);
            assert.strictEqual(result.pagination.limit, 10);
        });

        it('should search contacts by name', () => {
            const result = contacts.list({ search: 'João' });

            assert.ok(result.data.length > 0);
            assert.ok(result.data[0].name.includes('João'));
        });

        it('should filter contacts by source', () => {
            const result = contacts.list({ source: 'website' });

            assert.ok(result.data.length > 0);
            result.data.forEach(contact => {
                assert.strictEqual(contact.source, 'website');
            });
        });

        it('should sort contacts', () => {
            const result = contacts.list({ sortBy: 'name', sortOrder: 'ASC' });

            assert.ok(result.data.length > 0);
            // Verify sorting (first should come before second alphabetically)
            if (result.data.length > 1) {
                assert.ok(result.data[0].name <= result.data[1].name);
            }
        });
    });

    describe('addTags()', () => {
        it('should add tags to contact', () => {
            const updated = contacts.addTags(testContact.id, ['new-tag', 'another-tag']);

            assert.ok(updated.tags.includes('new-tag'));
            assert.ok(updated.tags.includes('another-tag'));
        });

        it('should not duplicate existing tags', () => {
            contacts.update(testContact.id, { tags: ['existing'] });
            const updated = contacts.addTags(testContact.id, ['existing', 'new']);

            const existingCount = updated.tags.filter(t => t === 'existing').length;
            assert.strictEqual(existingCount, 1);
        });
    });

    describe('removeTags()', () => {
        it('should remove tags from contact', () => {
            contacts.update(testContact.id, { tags: ['tag1', 'tag2', 'tag3'] });
            const updated = contacts.removeTags(testContact.id, ['tag2']);

            assert.ok(!updated.tags.includes('tag2'));
            assert.ok(updated.tags.includes('tag1'));
            assert.ok(updated.tags.includes('tag3'));
        });
    });

    describe('getOrCreate()', () => {
        it('should get existing contact', () => {
            const contact = contacts.getOrCreate('+5511999999999');

            assert.ok(contact);
            assert.strictEqual(contact.phone, '+5511999999999');
        });

        it('should create new contact if not exists', () => {
            const contact = contacts.getOrCreate('+5511444444444', {
                name: 'New Contact'
            });

            assert.ok(contact);
            assert.strictEqual(contact.phone, '+5511444444444');
            assert.strictEqual(contact.name, 'New Contact');
        });
    });

    describe('delete()', () => {
        it('should delete contact', () => {
            const contact = contacts.create({
                phone: '+5511333333333',
                name: 'To Delete'
            });

            const result = contacts.delete(contact.id);
            assert.strictEqual(result, true);

            const deleted = contacts.getById(contact.id);
            assert.strictEqual(deleted, null);
        });
    });

    describe('getStats()', () => {
        it('should return contact statistics', () => {
            const stats = contacts.getStats();

            assert.ok(stats);
            assert.ok(typeof stats.total === 'number');
            assert.ok(stats.total > 0);
            assert.ok(Array.isArray(stats.bySource));
        });
    });
});
