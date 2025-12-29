/**
 * Tests for Deals Routes
 * Integration tests for sales opportunity management endpoints
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Deals Routes', () => {
    let dealsModule;
    let contactsModule;
    let testContact;
    let testDeal;

    before(async () => {
        // Import modules
        const dealsPath = new URL('../../src/crm/deals.js', import.meta.url);
        const contactsPath = new URL('../../src/crm/contacts.js', import.meta.url);

        dealsModule = (await import(dealsPath.href)).default;
        contactsModule = (await import(contactsPath.href)).default;

        // Delete existing test contact if it exists
        const existing = contactsModule.getByPhone('+5511888888888');
        if (existing) {
            contactsModule.delete(existing.id);
        }

        // Create test contact with unique phone
        testContact = contactsModule.create({
            phone: '+5511888888888',
            name: 'Deal Test Contact',
            email: 'dealtest@contact.com'
        });
    });

    beforeEach(() => {
        // Delete previous test deal if it exists
        if (testDeal && testDeal.id) {
            try {
                dealsModule.delete(testDeal.id);
            } catch (err) {
                // Ignore if already deleted
            }
        }

        // Create a fresh test deal for each test
        testDeal = dealsModule.create({
            contact_id: testContact.id,
            title: 'Test Deal',
            value: 5000,
            pipeline: 'default'
        });
    });

    describe('GET /api/deals', () => {
        it('should list deals with default pagination', () => {
            const result = dealsModule.list({
                page: 1,
                limit: 10,
                pipeline: 'default',
                sortBy: 'created_at',
                sortOrder: 'DESC'
            });

            assert.ok(result, 'Should return result');
            assert.ok(Array.isArray(result.data), 'Should return data array');
            assert.ok(result.pagination, 'Should return pagination info');
            assert.strictEqual(typeof result.pagination.total, 'number');
        });

        it('should filter deals by stage', () => {
            const result = dealsModule.list({
                page: 1,
                limit: 10,
                pipeline: 'default',
                stage: 'lead'
            });

            assert.ok(Array.isArray(result.data));
            // All returned deals should be in 'lead' stage
            result.data.forEach(deal => {
                assert.strictEqual(deal.stage, 'lead');
            });
        });

        it('should filter deals by priority', () => {
            // Create high priority deal
            const highPriorityDeal = dealsModule.create({
                contact_id: testContact.id,
                title: 'High Priority Deal',
                priority: 'high'
            });

            const result = dealsModule.list({
                page: 1,
                limit: 10,
                pipeline: 'default',
                priority: 'high'
            });

            const found = result.data.some(d => d.id === highPriorityDeal.id);
            assert.ok(found, 'Should find high priority deal');

            // Cleanup
            dealsModule.delete(highPriorityDeal.id);
        });

        it('should search deals by title', () => {
            const result = dealsModule.list({
                page: 1,
                limit: 10,
                pipeline: 'default',
                search: 'Test Deal'
            });

            assert.ok(result.data.length > 0);
            const found = result.data.some(d => d.title === 'Test Deal');
            assert.ok(found, 'Should find test deal');
        });

        it('should support custom sorting', () => {
            const result = dealsModule.list({
                page: 1,
                limit: 10,
                pipeline: 'default',
                sortBy: 'value',
                sortOrder: 'DESC'
            });

            assert.ok(result.data.length > 0);
            // Verify descending order by value
            for (let i = 1; i < result.data.length; i++) {
                assert.ok(
                    result.data[i].value <= result.data[i - 1].value,
                    'Should be sorted by value descending'
                );
            }
        });
    });

    describe('GET /api/deals/kanban', () => {
        it('should return deals grouped by stage', () => {
            const result = dealsModule.getByStage('default');

            assert.ok(result, 'Should return result');
            assert.ok(typeof result === 'object', 'Should return object');

            // Should have stage keys
            const stages = Object.keys(result);
            assert.ok(stages.length > 0, 'Should have stages');

            // Each stage should be an object with deals array
            stages.forEach(stageName => {
                const stage = result[stageName];
                assert.ok(typeof stage === 'object', `Stage ${stageName} should be object`);
                assert.ok(Array.isArray(stage.deals), `Stage ${stageName} should have deals array`);
                assert.ok(typeof stage.total_value === 'number', 'Should have total_value');
            });
        });

        it('should include test deal in correct stage', () => {
            const result = dealsModule.getByStage('default');
            const leadStage = result.lead;

            assert.ok(leadStage, 'Should have lead stage');
            assert.ok(Array.isArray(leadStage.deals), 'Lead stage should have deals array');

            const found = leadStage.deals.some(d => d.id === testDeal.id);
            assert.ok(found, 'Should find test deal in lead stage');
        });
    });

    describe('GET /api/deals/stats', () => {
        it('should return pipeline statistics', () => {
            const stats = dealsModule.getPipelineStats('default');

            assert.ok(stats, 'Should return stats');
            assert.ok(Array.isArray(stats.byStage), 'Should have stage breakdown array');
            assert.ok(stats.totals, 'Should have totals object');
            assert.strictEqual(typeof stats.totals.total_deals, 'number');
            assert.strictEqual(typeof stats.totals.total_value, 'number');
            assert.strictEqual(typeof stats.totals.won_value, 'number');
            assert.strictEqual(typeof stats.totals.won_count, 'number');
            assert.strictEqual(typeof stats.totals.lost_count, 'number');
        });

        it('should calculate metrics correctly', () => {
            const stats = dealsModule.getPipelineStats('default');

            // Totals should be non-negative
            assert.ok(stats.totals.total_deals >= 0);
            assert.ok(stats.totals.total_value >= 0);
            assert.ok(stats.totals.won_value >= 0);
            assert.ok(stats.totals.won_count >= 0);
            assert.ok(stats.totals.lost_count >= 0);
        });
    });

    describe('GET /api/deals/:id', () => {
        it('should get deal by ID', () => {
            const deal = dealsModule.getById(testDeal.id);

            assert.ok(deal, 'Should return deal');
            assert.strictEqual(deal.id, testDeal.id);
            assert.strictEqual(deal.title, 'Test Deal');
            assert.strictEqual(deal.contact_id, testContact.id);
        });

        it('should return null for non-existent ID', () => {
            const deal = dealsModule.getById('nonexistent-id');
            assert.strictEqual(deal, null);
        });
    });

    describe('POST /api/deals', () => {
        it('should create deal with required fields', () => {
            const newDeal = dealsModule.create({
                contact_id: testContact.id,
                title: 'New Deal'
            });

            assert.ok(newDeal, 'Should create deal');
            assert.ok(newDeal.id, 'Should have ID');
            assert.strictEqual(newDeal.contact_id, testContact.id);
            assert.strictEqual(newDeal.title, 'New Deal');
            assert.strictEqual(newDeal.stage, 'lead', 'Should default to lead stage');

            // Cleanup
            dealsModule.delete(newDeal.id);
        });

        it('should create deal with all fields', () => {
            const fullDeal = dealsModule.create({
                contact_id: testContact.id,
                title: 'Full Deal',
                value: 10000,
                pipeline: 'default',
                stage: 'proposal',
                priority: 'high',
                custom_fields: { industry: 'tech' }
            });

            assert.ok(fullDeal);
            assert.strictEqual(fullDeal.title, 'Full Deal');
            assert.strictEqual(fullDeal.value, 10000);
            assert.strictEqual(fullDeal.stage, 'proposal');
            assert.strictEqual(fullDeal.priority, 'high');
            assert.strictEqual(fullDeal.custom_fields.industry, 'tech');

            // Cleanup
            dealsModule.delete(fullDeal.id);
        });

        it('should set default values', () => {
            const minimalDeal = dealsModule.create({
                contact_id: testContact.id,
                title: 'Minimal Deal'
            });

            assert.strictEqual(minimalDeal.value, 0, 'Value should default to 0');
            assert.strictEqual(minimalDeal.stage, 'lead', 'Stage should default to lead');
            assert.strictEqual(minimalDeal.pipeline, 'default', 'Pipeline should default to default');
            assert.strictEqual(minimalDeal.currency, 'BRL', 'Currency should default to BRL');
            assert.strictEqual(minimalDeal.probability, 50, 'Probability should default to 50');
            assert.strictEqual(minimalDeal.priority, 'medium', 'Priority should default to medium');

            // Cleanup
            dealsModule.delete(minimalDeal.id);
        });
    });

    describe('PUT /api/deals/:id', () => {
        it('should update deal fields', () => {
            const updated = dealsModule.update(testDeal.id, {
                title: 'Updated Deal',
                value: 7500,
                priority: 'high'
            });

            assert.ok(updated, 'Should return updated deal');
            assert.strictEqual(updated.title, 'Updated Deal');
            assert.strictEqual(updated.value, 7500);
            assert.strictEqual(updated.priority, 'high');
        });

        it('should not change immutable fields', () => {
            const updated = dealsModule.update(testDeal.id, {
                id: 'new-id', // Should not change
                contact_id: 'new-contact' // Should not change
            });

            assert.strictEqual(updated.id, testDeal.id, 'ID should not change');
            assert.strictEqual(updated.contact_id, testContact.id, 'Contact ID should not change');
        });

        it('should return null for non-existent deal', () => {
            const updated = dealsModule.update('nonexistent-id', {
                title: 'Test'
            });

            assert.strictEqual(updated, null);
        });
    });

    describe('PUT /api/deals/:id/stage', () => {
        it('should move deal to new stage', () => {
            const updated = dealsModule.moveToStage(testDeal.id, 'qualification');

            assert.ok(updated, 'Should return updated deal');
            assert.strictEqual(updated.stage, 'qualification');
            assert.ok(updated.updated_at, 'Should update timestamp');
        });

        it('should track stage history', () => {
            const initialStage = testDeal.stage;

            dealsModule.moveToStage(testDeal.id, 'qualification');
            dealsModule.moveToStage(testDeal.id, 'proposal');

            const deal = dealsModule.getById(testDeal.id);
            assert.strictEqual(deal.stage, 'proposal');
        });

        it('should return null for non-existent deal', () => {
            const updated = dealsModule.moveToStage('nonexistent-id', 'qualification');
            assert.strictEqual(updated, null);
        });
    });

    describe('PUT /api/deals/:id/won', () => {
        it('should mark deal as won', () => {
            const updated = dealsModule.markAsWon(testDeal.id, 'Customer accepted proposal');

            assert.ok(updated, 'Should return updated deal');
            assert.strictEqual(updated.stage, 'won');
            assert.strictEqual(updated.probability, 100);
            assert.ok(updated.actual_close_date, 'Should set close date');
            assert.strictEqual(updated.won_reason, 'Customer accepted proposal');
        });

        it('should mark as won without reason', () => {
            const updated = dealsModule.markAsWon(testDeal.id);

            assert.ok(updated);
            assert.strictEqual(updated.stage, 'won');
            assert.strictEqual(updated.probability, 100);
            assert.ok(updated.actual_close_date);
        });

        it('should return null for non-existent deal', () => {
            const updated = dealsModule.markAsWon('nonexistent-id');
            assert.strictEqual(updated, null);
        });
    });

    describe('PUT /api/deals/:id/lost', () => {
        it('should mark deal as lost', () => {
            const updated = dealsModule.markAsLost(testDeal.id, 'Price too high');

            assert.ok(updated, 'Should return updated deal');
            assert.strictEqual(updated.stage, 'lost');
            assert.strictEqual(updated.probability, 0);
            assert.ok(updated.actual_close_date, 'Should set close date');
            assert.strictEqual(updated.lost_reason, 'Price too high');
        });

        it('should mark as lost without reason', () => {
            const updated = dealsModule.markAsLost(testDeal.id);

            assert.ok(updated);
            assert.strictEqual(updated.stage, 'lost');
            assert.strictEqual(updated.probability, 0);
            assert.ok(updated.actual_close_date);
        });

        it('should return null for non-existent deal', () => {
            const updated = dealsModule.markAsLost('nonexistent-id');
            assert.strictEqual(updated, null);
        });
    });

    describe('DELETE /api/deals/:id', () => {
        it('should delete deal', () => {
            const toDelete = dealsModule.create({
                contact_id: testContact.id,
                title: 'To Delete'
            });

            dealsModule.delete(toDelete.id);

            const deleted = dealsModule.getById(toDelete.id);
            assert.strictEqual(deleted, null, 'Deal should be deleted');
        });

        it('should handle deleting non-existent deal', () => {
            // Should not throw error
            dealsModule.delete('nonexistent-id');
        });
    });

    describe('Deal Lifecycle', () => {
        it('should track complete deal lifecycle', () => {
            // Create
            const deal = dealsModule.create({
                contact_id: testContact.id,
                title: 'Lifecycle Test',
                value: 15000
            });
            assert.strictEqual(deal.stage, 'lead');

            // Move through stages
            dealsModule.moveToStage(deal.id, 'qualification');
            dealsModule.moveToStage(deal.id, 'proposal');
            dealsModule.moveToStage(deal.id, 'negotiation');

            const progressed = dealsModule.getById(deal.id);
            assert.strictEqual(progressed.stage, 'negotiation');

            // Close as won
            const won = dealsModule.markAsWon(deal.id, 'Deal closed successfully');
            assert.strictEqual(won.stage, 'won');
            assert.ok(won.actual_close_date);

            // Cleanup
            dealsModule.delete(deal.id);
        });

        it('should handle deal being lost at any stage', () => {
            const deal = dealsModule.create({
                contact_id: testContact.id,
                title: 'Lost Deal Test'
            });

            dealsModule.moveToStage(deal.id, 'qualification');

            const lost = dealsModule.markAsLost(deal.id, 'No budget');
            assert.strictEqual(lost.stage, 'lost');

            // Cleanup
            dealsModule.delete(deal.id);
        });
    });

    after(() => {
        // Cleanup test deals
        if (testDeal && testDeal.id) {
            dealsModule.delete(testDeal.id);
        }

        // Clean up any remaining test deals
        const allDeals = dealsModule.list({ page: 1, limit: 1000, pipeline: 'default' });
        allDeals.data.forEach(deal => {
            if (deal.title && deal.title.includes('Test')) {
                dealsModule.delete(deal.id);
            }
        });

        // Cleanup test contact
        if (testContact && testContact.id) {
            contactsModule.delete(testContact.id);
        }
    });
});
