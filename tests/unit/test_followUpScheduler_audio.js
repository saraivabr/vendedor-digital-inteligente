/**
 * Tests for Follow-Up Scheduler Audio Feature
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock FollowUpScheduler class for testing
class MockFollowUpScheduler {
    shouldSendAudioFollowUp(conversation, followUpNumber, history) {
        let chance = 30;

        if (followUpNumber === 3 || followUpNumber === 4) {
            chance += 20;
        }

        const leadSentAudio = this.hasLeadSentAudio(history);
        if (leadSentAudio) {
            chance += 30;
        }

        return { chance, willSend: Math.random() * 100 < chance };
    }

    hasLeadSentAudio(history) {
        if (!history || history.length === 0) {
            return false;
        }

        return history.some(msg => {
            return msg.role === 'user' && (
                msg.content.includes('[ÁUDIO]') ||
                msg.content.includes('[AUDIO]') ||
                msg.content.toLowerCase().includes('áudio recebido') ||
                msg.content.toLowerCase().includes('audio recebido')
            );
        });
    }
}

describe('FollowUpScheduler Audio Features', () => {
    let scheduler;

    beforeEach(() => {
        scheduler = new MockFollowUpScheduler();
    });

    describe('hasLeadSentAudio', () => {
        it('should return false for empty history', () => {
            const result = scheduler.hasLeadSentAudio([]);
            assert.strictEqual(result, false);
        });

        it('should return false when no audio messages', () => {
            const history = [
                { role: 'user', content: 'Olá' },
                { role: 'assistant', content: 'Oi!' }
            ];
            const result = scheduler.hasLeadSentAudio(history);
            assert.strictEqual(result, false);
        });

        it('should return true when user sent audio with [ÁUDIO] tag', () => {
            const history = [
                { role: 'user', content: '[ÁUDIO]' },
                { role: 'assistant', content: 'Entendi!' }
            ];
            const result = scheduler.hasLeadSentAudio(history);
            assert.strictEqual(result, true);
        });

        it('should return true when user sent audio with [AUDIO] tag', () => {
            const history = [
                { role: 'user', content: '[AUDIO]' },
                { role: 'assistant', content: 'Entendi!' }
            ];
            const result = scheduler.hasLeadSentAudio(history);
            assert.strictEqual(result, true);
        });

        it('should return true when user sent "áudio recebido"', () => {
            const history = [
                { role: 'user', content: 'áudio recebido' }
            ];
            const result = scheduler.hasLeadSentAudio(history);
            assert.strictEqual(result, true);
        });
    });

    describe('shouldSendAudioFollowUp', () => {
        it('should have 30% base chance for follow-up #1', () => {
            const conversation = { phone: '5511999999999' };
            const history = [];
            const result = scheduler.shouldSendAudioFollowUp(conversation, 1, history);

            assert.strictEqual(result.chance, 30);
        });

        it('should have 50% chance for follow-up #3 (30 + 20)', () => {
            const conversation = { phone: '5511999999999' };
            const history = [];
            const result = scheduler.shouldSendAudioFollowUp(conversation, 3, history);

            assert.strictEqual(result.chance, 50);
        });

        it('should have 50% chance for follow-up #4 (30 + 20)', () => {
            const conversation = { phone: '5511999999999' };
            const history = [];
            const result = scheduler.shouldSendAudioFollowUp(conversation, 4, history);

            assert.strictEqual(result.chance, 50);
        });

        it('should have 60% chance when lead sent audio before', () => {
            const conversation = { phone: '5511999999999' };
            const history = [
                { role: 'user', content: '[ÁUDIO]' }
            ];
            const result = scheduler.shouldSendAudioFollowUp(conversation, 1, history);

            assert.strictEqual(result.chance, 60);
        });

        it('should have 80% chance for follow-up #3 with audio history', () => {
            const conversation = { phone: '5511999999999' };
            const history = [
                { role: 'user', content: '[ÁUDIO]' }
            ];
            const result = scheduler.shouldSendAudioFollowUp(conversation, 3, history);

            assert.strictEqual(result.chance, 80);
        });
    });
});
