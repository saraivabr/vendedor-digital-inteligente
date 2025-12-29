/**
 * Tests for Deals Manager
 * Comprehensive test suite for CRM deal/pipeline operations
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createTestDb, resetTestDb } from '../setup-test-db.js';
import { ContactsManager } from '../../src/crm/contacts.js';
import { DealsManager } from '../../src/crm/deals.js';

// Create test database and managers
const testDb = createTestDb();
const contacts = new ContactsManager(testDb);
const deals = new DealsManager(testDb);

describe('DealsManager', () => {
    let testContact;
    let testDeal;

    before(() => {
        // Reset database once before all tests
        resetTestDb(testDb);

        // Create a test contact for deals
        testContact = contacts.create({
            phone: '+5511999887766',
            name: 'Deal Test Contact',
            email: 'deal@example.com'
        });
    });

    describe('create()', () => {
        it('should create a new deal with required fields', () => {
            testDeal = deals.create({
                contact_id: testContact.id,
                title: 'Test Deal',
                value: 10000,
                stage: 'lead'
            });

            assert.ok(testDeal);
            assert.ok(testDeal.id);
            assert.strictEqual(testDeal.contact_id, testContact.id);
            assert.strictEqual(testDeal.title, 'Test Deal');
            assert.strictEqual(testDeal.value, 10000);
            assert.strictEqual(testDeal.stage, 'lead');
            assert.strictEqual(testDeal.currency, 'BRL');
            assert.strictEqual(testDeal.pipeline, 'default');
        });

        it('should create deal with custom pipeline and priority', () => {
            const deal = deals.create({
                contact_id: testContact.id,
                title: 'Priority Deal',
                value: 50000,
                priority: 'high',
                pipeline: 'enterprise'
            });

            assert.strictEqual(deal.priority, 'high');
            assert.strictEqual(deal.pipeline, 'enterprise');
        });

        it('should create deal with tags and custom fields', () => {
            const deal = deals.create({
                contact_id: testContact.id,
                title: 'Tagged Deal',
                tags: ['urgent', 'enterprise'],
                custom_fields: { industry: 'tech', employees: 500 }
            });

            assert.deepStrictEqual(deal.tags, ['urgent', 'enterprise']);
            assert.deepStrictEqual(deal.custom_fields, { industry: 'tech', employees: 500 });
        });
    });

    describe('getById()', () => {
        it('should retrieve deal by ID', () => {
            const deal = deals.getById(testDeal.id);
            assert.ok(deal);
            assert.strictEqual(deal.id, testDeal.id);
            assert.strictEqual(deal.title, testDeal.title);
        });

        it('should include contact info in deal', () => {
            const deal = deals.getById(testDeal.id);
            assert.strictEqual(deal.contact_name, testContact.name);
            assert.strictEqual(deal.contact_phone, testContact.phone);
        });

        it('should return null for non-existent ID', () => {
            const deal = deals.getById('non-existent-id');
            assert.strictEqual(deal, null);
        });
    });

    describe('update()', () => {
        it('should update deal fields', () => {
            const updated = deals.update(testDeal.id, {
                title: 'Updated Deal',
                value: 15000,
                probability: 75
            });

            assert.strictEqual(updated.title, 'Updated Deal');
            assert.strictEqual(updated.value, 15000);
            assert.strictEqual(updated.probability, 75);
        });

        it('should update tags and custom fields', () => {
            const updated = deals.update(testDeal.id, {
                tags: ['updated'],
                custom_fields: { note: 'test' }
            });

            assert.deepStrictEqual(updated.tags, ['updated']);
            assert.deepStrictEqual(updated.custom_fields, { note: 'test' });
        });

        it('should return null for non-existent deal', () => {
            const updated = deals.update('non-existent-id', { title: 'Test' });
            assert.strictEqual(updated, null);
        });
    });

    describe('moveToStage()', () => {
        it('should move deal to new stage', () => {
            const updated = deals.moveToStage(testDeal.id, 'qualified');

            assert.strictEqual(updated.stage, 'qualified');
            // Should update probability based on stage
            assert.ok(updated.probability >= 0);
        });

        it('should log stage change activity', () => {
            deals.moveToStage(testDeal.id, 'proposal');
            const timeline = contacts.getTimeline(testContact.id);

            const stageChange = timeline.find(a => a.type === 'stage_change');
            assert.ok(stageChange);
        });
    });

    describe('markAsWon()', () => {
        it('should mark deal as won', () => {
            const wonDeal = deals.create({
                contact_id: testContact.id,
                title: 'To Win',
                value: 20000
            });

            const updated = deals.markAsWon(wonDeal.id, 'Customer signed contract');

            assert.strictEqual(updated.stage, 'won');
            assert.strictEqual(updated.probability, 100);
            assert.ok(updated.actual_close_date);
            assert.strictEqual(updated.won_reason, 'Customer signed contract');
        });

        it('should log won activity', () => {
            const wonDeal = deals.create({
                contact_id: testContact.id,
                title: 'Another Win',
                value: 25000
            });

            deals.markAsWon(wonDeal.id);
            const timeline = contacts.getTimeline(testContact.id);

            const wonActivity = timeline.find(a => a.type === 'deal_won');
            assert.ok(wonActivity);
        });
    });

    describe('markAsLost()', () => {
        it('should mark deal as lost', () => {
            const lostDeal = deals.create({
                contact_id: testContact.id,
                title: 'To Lose',
                value: 5000
            });

            const updated = deals.markAsLost(lostDeal.id, 'Budget constraints');

            assert.strictEqual(updated.stage, 'lost');
            assert.strictEqual(updated.probability, 0);
            assert.ok(updated.actual_close_date);
            assert.strictEqual(updated.lost_reason, 'Budget constraints');
        });

        it('should log lost activity', () => {
            const lostDeal = deals.create({
                contact_id: testContact.id,
                title: 'Another Loss',
                value: 3000
            });

            deals.markAsLost(lostDeal.id);
            const timeline = contacts.getTimeline(testContact.id);

            const lostActivity = timeline.find(a => a.type === 'deal_lost');
            assert.ok(lostActivity);
        });
    });

    describe('list()', () => {
        before(() => {
            // Create additional deals for listing tests
            deals.create({
                contact_id: testContact.id,
                title: 'Deal 1',
                stage: 'lead',
                priority: 'low'
            });
            deals.create({
                contact_id: testContact.id,
                title: 'Deal 2',
                stage: 'qualified',
                priority: 'high'
            });
        });

        it('should list all deals with pagination', () => {
            const result = deals.list({ page: 1, limit: 10 });

            assert.ok(result.data);
            assert.ok(Array.isArray(result.data));
            assert.ok(result.data.length > 0);
            assert.ok(result.pagination);
        });

        it('should filter deals by stage', () => {
            const result = deals.list({ stage: 'lead' });

            assert.ok(result.data.length > 0);
            result.data.forEach(deal => {
                assert.strictEqual(deal.stage, 'lead');
            });
        });

        it('should filter deals by priority', () => {
            const result = deals.list({ priority: 'high' });

            assert.ok(result.data.length > 0);
            result.data.forEach(deal => {
                assert.strictEqual(deal.priority, 'high');
            });
        });

        it('should search deals by title', () => {
            const result = deals.list({ search: 'Deal 1' });

            assert.ok(result.data.length > 0);
            assert.ok(result.data[0].title.includes('Deal 1'));
        });
    });

    describe('getByStage()', () => {
        it('should group deals by stage', () => {
            const byStage = deals.getByStage('default');

            assert.ok(byStage);
            assert.ok(byStage.lead);
            assert.ok(Array.isArray(byStage.lead.deals));
            assert.ok(typeof byStage.lead.total_value === 'number');
        });

        it('should include stage metadata', () => {
            const byStage = deals.getByStage('default');

            // Check that stages have required properties
            Object.values(byStage).forEach(stage => {
                assert.ok(stage.name);
                assert.ok(typeof stage.order_index === 'number');
                assert.ok(typeof stage.probability === 'number');
                assert.ok(Array.isArray(stage.deals));
            });
        });
    });

    describe('getPipelineStats()', () => {
        it('should return pipeline statistics', () => {
            const stats = deals.getPipelineStats('default');

            assert.ok(stats);
            assert.ok(Array.isArray(stats.byStage));
            assert.ok(stats.totals);
            assert.ok(typeof stats.totals.total_deals === 'number');
        });

        it('should include stage breakdowns', () => {
            const stats = deals.getPipelineStats('default');

            stats.byStage.forEach(stageStat => {
                assert.ok(stageStat.stage);
                assert.ok(typeof stageStat.count === 'number');
                assert.ok(typeof stageStat.total_value === 'number');
            });
        });
    });

    describe('getOrCreateForContact()', () => {
        it('should get existing open deal for contact', () => {
            const existingDeal = deals.create({
                contact_id: testContact.id,
                title: 'Existing Open',
                stage: 'qualified'
            });

            const deal = deals.getOrCreateForContact(testContact.id);

            assert.ok(deal);
            // Should return one of the existing open deals
            assert.notStrictEqual(deal.stage, 'won');
            assert.notStrictEqual(deal.stage, 'lost');
        });

        it('should create new deal if no open deals exist', () => {
            const newContact = contacts.create({
                phone: '+5511888777666',
                name: 'No Deals Contact'
            });

            const deal = deals.getOrCreateForContact(newContact.id, {
                title: 'First Deal'
            });

            assert.ok(deal);
            assert.strictEqual(deal.contact_id, newContact.id);
            assert.strictEqual(deal.title, 'First Deal');
        });
    });

    describe('delete()', () => {
        it('should delete deal', () => {
            const dealToDelete = deals.create({
                contact_id: testContact.id,
                title: 'To Delete'
            });

            const result = deals.delete(dealToDelete.id);
            assert.strictEqual(result, true);

            const deleted = deals.getById(dealToDelete.id);
            assert.strictEqual(deleted, null);
        });
    });
});
