/**
 * CRM Sync Service
 * Automatically syncs WhatsApp interactions with CRM
 */

import contacts from './contacts.js';
import deals from './deals.js';
import activities from './activities.js';
import metrics from './metrics.js';

class CRMSync {
    /**
     * Process incoming WhatsApp message
     * Called from index.js when a message is received
     */
    async processIncomingMessage(messageData) {
        const { phone, name, content, type, messageId } = messageData;

        try {
            // 1. Get or create contact
            const contact = contacts.getOrCreate(phone, {
                name: name || null,
                source: 'whatsapp'
            });

            // 2. Update contact name if we have it now
            if (name && !contact.name) {
                contacts.update(contact.id, { name });
            }

            // 3. Get or create deal for this contact
            const deal = deals.getOrCreateForContact(contact.id, {
                title: `Lead WhatsApp - ${name || phone}`,
                source: 'whatsapp'
            });

            // 4. Log activity
            activities.logMessage(contact.id, deal.id, 'received', content, {
                message_id: messageId,
                type: type || 'text'
            });

            // 5. Update daily metrics
            this.incrementMetric('messages_received');

            console.log(`📥 CRM Sync: Mensagem recebida de ${name || phone}`);

            return { contact, deal };

        } catch (error) {
            console.error('❌ CRM Sync Error (incoming):', error.message);
            return null;
        }
    }

    /**
     * Process outgoing WhatsApp message
     * Called when bot sends a response
     */
    async processOutgoingMessage(phone, content, metadata = {}) {
        try {
            const contact = contacts.getByPhone(phone);
            if (!contact) return null;

            // Get active deal
            const contactDeals = contacts.getDeals(contact.id);
            const activeDeal = contactDeals.find(d => !['won', 'lost'].includes(d.stage));

            // Log activity
            activities.logMessage(
                contact.id,
                activeDeal?.id || null,
                'sent',
                content,
                metadata
            );

            // Update metrics
            this.incrementMetric('messages_sent');

            return { contact, deal: activeDeal };

        } catch (error) {
            console.error('❌ CRM Sync Error (outgoing):', error.message);
            return null;
        }
    }

    /**
     * Process follow-up sent
     */
    async processFollowUp(phone, message, followUpNumber) {
        try {
            const contact = contacts.getByPhone(phone);
            if (!contact) return;

            const contactDeals = contacts.getDeals(contact.id);
            const activeDeal = contactDeals.find(d => !['won', 'lost'].includes(d.stage));

            // Log follow-up activity
            activities.logFollowUp(
                contact.id,
                activeDeal?.id || null,
                message,
                followUpNumber
            );

            // Update metrics
            this.incrementMetric('followups_sent');

            console.log(`🔄 CRM Sync: Follow-up #${followUpNumber} para ${contact.name || phone}`);

        } catch (error) {
            console.error('❌ CRM Sync Error (followup):', error.message);
        }
    }

    /**
     * Update deal stage based on conversation analysis
     */
    async updateDealStage(phone, analysis, conversationData) {
        try {
            const contact = contacts.getByPhone(phone);
            if (!contact) return;

            const contactDeals = contacts.getDeals(contact.id);
            const activeDeal = contactDeals.find(d => !['won', 'lost'].includes(d.stage));
            if (!activeDeal) return;

            let newStage = null;

            // Determine new stage based on analysis (priority order matters!)

            // 1. Check for explicit confirmation to close (highest priority)
            if (analysis.intent === 'confirmation' && analysis.sentiment === 'positive' && activeDeal.stage === 'negotiation') {
                // Positive confirmation - could be closing
                const confirmWords = ['sim', 'fechado', 'vamos', 'quero', 'aceito', 'fechar'];
                const content = conversationData.content?.toLowerCase() || '';
                if (confirmWords.some(w => content.includes(w))) {
                    newStage = 'won';
                }
            }

            // 2. Check for rejection signals
            else if (analysis.intent === 'rejection' || analysis.sentiment === 'negative') {
                // Check for lost signals
                const lostWords = ['não quero', 'desisto', 'muito caro', 'outro momento'];
                if (lostWords.some(w => conversationData.content?.toLowerCase().includes(w))) {
                    newStage = 'lost';
                }
            }

            // 3. Check for strong buying signals (move to negotiation)
            else if (analysis.buyingSignal && analysis.engagementLevel === 'hot') {
                if (['lead', 'qualified'].includes(activeDeal.stage)) {
                    newStage = 'negotiation';
                }
            }

            // 4. Warm engagement - qualify the lead
            else if (analysis.engagementLevel === 'warm' && activeDeal.stage === 'lead') {
                newStage = 'qualified';
            }

            // Update stage if changed
            if (newStage && newStage !== activeDeal.stage) {
                if (newStage === 'won') {
                    deals.markAsWon(activeDeal.id, 'Fechado via WhatsApp');
                } else if (newStage === 'lost') {
                    const reason = analysis.objection || 'Lead não qualificado';
                    deals.markAsLost(activeDeal.id, reason);
                } else {
                    deals.moveToStage(activeDeal.id, newStage);
                }

                console.log(`📊 CRM Sync: Deal movido para ${newStage}`);
            }

            // Update contact tags based on engagement
            if (analysis.engagementLevel) {
                const tagMap = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
                const tag = tagMap[analysis.engagementLevel];
                if (tag) {
                    // Remove old engagement tags and add new
                    contacts.removeTags(contact.id, ['Hot', 'Warm', 'Cold']);
                    contacts.addTags(contact.id, [tag]);
                }
            }

        } catch (error) {
            console.error('❌ CRM Sync Error (stage update):', error.message);
        }
    }

    /**
     * Extract and save lead info from conversation
     */
    async extractLeadInfo(phone, conversationData) {
        try {
            const contact = contacts.getByPhone(phone);
            if (!contact) return;

            const updates = {};

            // Extract pain points
            if (conversationData.extracted_pain && !contact.notes?.includes(conversationData.extracted_pain)) {
                updates.notes = (contact.notes || '') +
                    `\n[${new Date().toLocaleDateString()}] Dor: ${conversationData.extracted_pain}`;
            }

            // Extract objections
            if (conversationData.extracted_objections) {
                updates.custom_fields = {
                    ...contact.custom_fields,
                    objections: conversationData.extracted_objections
                };
            }

            if (Object.keys(updates).length > 0) {
                contacts.update(contact.id, updates);
            }

        } catch (error) {
            console.error('❌ CRM Sync Error (extract info):', error.message);
        }
    }

    /**
     * Increment daily metric
     */
    incrementMetric(field) {
        try {
            // This will be handled by the metrics service
            // For now, just log
            console.log(`📈 Metric: ${field} +1`);
        } catch (error) {
            // Ignore metric errors
        }
    }

    /**
     * Get contact summary for conversation context
     */
    getContactSummary(phone) {
        try {
            const contact = contacts.getByPhone(phone);
            if (!contact) return null;

            const contactDeals = contacts.getDeals(contact.id);
            const activeDeal = contactDeals.find(d => !['won', 'lost'].includes(d.stage));

            return {
                id: contact.id,
                name: contact.name,
                company: contact.company_name,
                tags: contact.tags,
                notes: contact.notes,
                customFields: contact.custom_fields,
                currentStage: activeDeal?.stage || 'lead',
                dealValue: activeDeal?.value || 0,
                totalDeals: contactDeals.length,
                wonDeals: contactDeals.filter(d => d.stage === 'won').length
            };

        } catch (error) {
            console.error('❌ CRM Sync Error (summary):', error.message);
            return null;
        }
    }
}

export default new CRMSync();
