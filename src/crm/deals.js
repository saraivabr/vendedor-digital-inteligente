/**
 * Deals Manager - CRM Deal/Opportunity Management
 * Handles all deal-related operations including pipeline management
 */

import { v4 as uuidv4 } from 'uuid';
import dbService from '../database/db.js';

class DealsManager {
    constructor(customDb = null) {
        this.db = customDb || dbService.db;
    }
    /**
     * Create a new deal
     */
    create(data) {
        const id = data.id || uuidv4();
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO deals (
                id, contact_id, title, stage, value, currency, probability,
                expected_close_date, actual_close_date, lost_reason, won_reason,
                assigned_to, pipeline, priority, tags, custom_fields,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            data.contact_id,
            data.title || 'Nova Oportunidade',
            data.stage || 'lead',
            data.value || 0,
            data.currency || 'BRL',
            data.probability || 50,
            data.expected_close_date || null,
            null,
            null,
            null,
            data.assigned_to || null,
            data.pipeline || 'default',
            data.priority || 'medium',
            JSON.stringify(data.tags || []),
            JSON.stringify(data.custom_fields || {}),
            now,
            now
        );

        // Log activity
        this._logActivity(id, data.contact_id, 'deal_created', 'Deal criado', {
            title: data.title,
            value: data.value
        });

        return this.getById(id);
    }

    /**
     * Get deal by ID
     */
    getById(id) {
        const deal = this.db.prepare(`
            SELECT d.*, c.name as contact_name, c.phone as contact_phone
            FROM deals d
            LEFT JOIN contacts c ON d.contact_id = c.id
            WHERE d.id = ?
        `).get(id);
        return deal ? this._parseDeal(deal) : null;
    }

    /**
     * Update deal
     */
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const updates = [];
        const values = [];

        const fields = [
            'title', 'value', 'currency', 'probability',
            'expected_close_date', 'assigned_to', 'pipeline', 'priority'
        ];

        for (const field of fields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (data.tags !== undefined) {
            updates.push('tags = ?');
            values.push(JSON.stringify(data.tags));
        }
        if (data.custom_fields !== undefined) {
            updates.push('custom_fields = ?');
            values.push(JSON.stringify(data.custom_fields));
        }

        if (updates.length === 0) return existing;

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        this.db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Move deal to stage
     */
    moveToStage(id, newStage) {
        const deal = this.getById(id);
        if (!deal) return null;

        const oldStage = deal.stage;

        // Get stage probability
        const stageInfo = this.db.prepare(
            'SELECT probability FROM pipeline_stages WHERE pipeline = ? AND name = ?'
        ).get(deal.pipeline, newStage);

        const probability = stageInfo ? stageInfo.probability : deal.probability;

        this.db.prepare(`
            UPDATE deals SET stage = ?, probability = ?, updated_at = ? WHERE id = ?
        `).run(newStage, probability, new Date().toISOString(), id);

        // Log activity
        this._logActivity(id, deal.contact_id, 'stage_change', `Movido de ${oldStage} para ${newStage}`, {
            old_stage: oldStage,
            new_stage: newStage
        });

        return this.getById(id);
    }

    /**
     * Mark deal as won
     */
    markAsWon(id, reason = null) {
        const deal = this.getById(id);
        if (!deal) return null;

        const now = new Date().toISOString();

        this.db.prepare(`
            UPDATE deals SET
                stage = 'won',
                probability = 100,
                actual_close_date = ?,
                won_reason = ?,
                updated_at = ?
            WHERE id = ?
        `).run(now, reason, now, id);

        this._logActivity(id, deal.contact_id, 'deal_won', 'Deal ganho!', {
            value: deal.value,
            reason
        });

        // Update daily metrics
        this._updateMetrics('deals_won', deal.value);

        return this.getById(id);
    }

    /**
     * Mark deal as lost
     */
    markAsLost(id, reason = null) {
        const deal = this.getById(id);
        if (!deal) return null;

        const now = new Date().toISOString();

        this.db.prepare(`
            UPDATE deals SET
                stage = 'lost',
                probability = 0,
                actual_close_date = ?,
                lost_reason = ?,
                updated_at = ?
            WHERE id = ?
        `).run(now, reason, now, id);

        this._logActivity(id, deal.contact_id, 'deal_lost', 'Deal perdido', {
            value: deal.value,
            reason
        });

        this._updateMetrics('deals_lost', 0);

        return this.getById(id);
    }

    /**
     * Delete deal
     */
    delete(id) {
        this.db.prepare('DELETE FROM deals WHERE id = ?').run(id);
        return true;
    }

    /**
     * List deals with filters
     */
    list(options = {}) {
        const {
            page = 1,
            limit = 50,
            pipeline = 'default',
            stage = null,
            assignedTo = null,
            priority = null,
            search = null,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        let query = `
            SELECT d.*, c.name as contact_name, c.phone as contact_phone
            FROM deals d
            LEFT JOIN contacts c ON d.contact_id = c.id
            WHERE d.pipeline = ?
        `;
        const params = [pipeline];

        if (stage) {
            query += ' AND d.stage = ?';
            params.push(stage);
        }

        if (assignedTo) {
            query += ' AND d.assigned_to = ?';
            params.push(assignedTo);
        }

        if (priority) {
            query += ' AND d.priority = ?';
            params.push(priority);
        }

        if (search) {
            query += ' AND (d.title LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Count
        const countQuery = query.replace(/SELECT d\.\*, c\.name as contact_name, c\.phone as contact_phone/, 'SELECT COUNT(*) as total');
        const { total } = this.db.prepare(countQuery).get(...params);

        query += ` ORDER BY d.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(limit, (page - 1) * limit);

        const deals = this.db.prepare(query).all(...params);

        return {
            data: deals.map(d => this._parseDeal(d)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get deals by stage (for kanban)
     */
    getByStage(pipeline = 'default') {
        const stages = this.db.prepare(`
            SELECT * FROM pipeline_stages WHERE pipeline = ? ORDER BY order_index
        `).all(pipeline);

        const result = {};

        for (const stage of stages) {
            const deals = this.db.prepare(`
                SELECT d.*, c.name as contact_name, c.phone as contact_phone
                FROM deals d
                LEFT JOIN contacts c ON d.contact_id = c.id
                WHERE d.pipeline = ? AND d.stage = ?
                ORDER BY d.updated_at DESC
            `).all(pipeline, stage.name);

            result[stage.name] = {
                ...stage,
                deals: deals.map(d => this._parseDeal(d)),
                total_value: deals.reduce((sum, d) => sum + (d.value || 0), 0)
            };
        }

        return result;
    }

    /**
     * Get pipeline statistics
     */
    getPipelineStats(pipeline = 'default') {
        const stats = this.db.prepare(`
            SELECT
                stage,
                COUNT(*) as count,
                SUM(value) as total_value,
                AVG(probability) as avg_probability
            FROM deals
            WHERE pipeline = ? AND stage NOT IN ('won', 'lost')
            GROUP BY stage
        `).all(pipeline);

        const totals = this.db.prepare(`
            SELECT
                COUNT(*) as total_deals,
                SUM(value) as total_value,
                SUM(CASE WHEN stage = 'won' THEN value ELSE 0 END) as won_value,
                COUNT(CASE WHEN stage = 'won' THEN 1 END) as won_count,
                COUNT(CASE WHEN stage = 'lost' THEN 1 END) as lost_count
            FROM deals
            WHERE pipeline = ?
        `).get(pipeline);

        return { byStage: stats, totals };
    }

    /**
     * Get or create deal for contact
     */
    getOrCreateForContact(contactId, data = {}) {
        // Check for existing open deal
        const existing = this.db.prepare(`
            SELECT * FROM deals
            WHERE contact_id = ? AND stage NOT IN ('won', 'lost')
            ORDER BY created_at DESC
            LIMIT 1
        `).get(contactId);

        if (existing) {
            return this._parseDeal(existing);
        }

        return this.create({ contact_id: contactId, ...data });
    }

    /**
     * Parse deal from database
     */
    _parseDeal(deal) {
        return {
            ...deal,
            tags: JSON.parse(deal.tags || '[]'),
            custom_fields: JSON.parse(deal.custom_fields || '{}')
        };
    }

    /**
     * Log activity for deal
     */
    _logActivity(dealId, contactId, type, title, metadata = {}) {
        this.db.prepare(`
            INSERT INTO activities (id, contact_id, deal_id, type, title, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            uuidv4(),
            contactId,
            dealId,
            type,
            title,
            JSON.stringify(metadata),
            new Date().toISOString()
        );
    }

    /**
     * Update daily metrics
     */
    _updateMetrics(field, value) {
        const today = new Date().toISOString().split('T')[0];

        // First try to update existing record
        if (field === 'deals_won') {
            const updated = this.db.prepare(`
                UPDATE daily_metrics
                SET ${field} = ${field} + 1,
                    revenue_won = revenue_won + ?,
                    updated_at = ?
                WHERE date = ?
            `).run(value, new Date().toISOString(), today);

            // If no rows updated, insert new record
            if (updated.changes === 0) {
                this.db.prepare(`
                    INSERT INTO daily_metrics (id, date, ${field}, revenue_won)
                    VALUES (?, ?, 1, ?)
                `).run(uuidv4(), today, value);
            }
        } else {
            const updated = this.db.prepare(`
                UPDATE daily_metrics
                SET ${field} = ${field} + 1,
                    updated_at = ?
                WHERE date = ?
            `).run(new Date().toISOString(), today);

            // If no rows updated, insert new record
            if (updated.changes === 0) {
                this.db.prepare(`
                    INSERT INTO daily_metrics (id, date, ${field})
                    VALUES (?, ?, 1)
                `).run(uuidv4(), today);
            }
        }
    }
}

// Export singleton instance for normal use
export default new DealsManager();

// Export class for testing
export { DealsManager };
