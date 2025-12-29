/**
 * Activities Manager - CRM Activity Tracking
 * Tracks all interactions: messages, calls, meetings, stage changes, etc.
 */

import db from '../database/db.js';

class ActivitiesManager {
    // Activity types
    static TYPES = {
        MESSAGE_SENT: 'message_sent',
        MESSAGE_RECEIVED: 'message_received',
        CALL: 'call',
        MEETING: 'meeting',
        NOTE: 'note',
        TASK: 'task',
        EMAIL: 'email',
        STAGE_CHANGE: 'stage_change',
        DEAL_CREATED: 'deal_created',
        DEAL_WON: 'deal_won',
        DEAL_LOST: 'deal_lost',
        FOLLOWUP: 'followup'
    };

    /**
     * Generate unique activity ID
     */
    _generateId() {
        return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log a new activity
     */
    log(data) {
        const id = this._generateId();
        const now = new Date().toISOString();

        db.db.prepare(`
            INSERT INTO activities (
                id, contact_id, deal_id, type, title, description,
                metadata, is_completed, due_date, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.contact_id || null,
            data.deal_id || null,
            data.type,
            data.title || null,
            data.description || null,
            JSON.stringify(data.metadata || {}),
            data.is_completed ? 1 : 0,
            data.due_date || null,
            data.created_by || 'system',
            now
        );

        return this.getById(id);
    }

    /**
     * Log message activity (from WhatsApp)
     */
    logMessage(contactId, dealId, direction, content, metadata = {}) {
        return this.log({
            contact_id: contactId,
            deal_id: dealId,
            type: direction === 'sent' ? this.constructor.TYPES.MESSAGE_SENT : this.constructor.TYPES.MESSAGE_RECEIVED,
            title: direction === 'sent' ? 'Mensagem enviada' : 'Mensagem recebida',
            description: content.substring(0, 200),
            metadata: { ...metadata, full_content: content },
            is_completed: true
        });
    }

    /**
     * Log follow-up activity
     */
    logFollowUp(contactId, dealId, message, followUpNumber) {
        return this.log({
            contact_id: contactId,
            deal_id: dealId,
            type: this.constructor.TYPES.FOLLOWUP,
            title: `Follow-up #${followUpNumber}`,
            description: message,
            metadata: { follow_up_number: followUpNumber },
            is_completed: true
        });
    }

    /**
     * Get activity by ID
     */
    getById(id) {
        const activity = db.db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
        return activity ? this._parseActivity(activity) : null;
    }

    /**
     * Get activities for contact (timeline)
     */
    getForContact(contactId, options = {}) {
        const { limit = 50, offset = 0, type = null } = options;

        let query = 'SELECT * FROM activities WHERE contact_id = ?';
        const params = [contactId];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return db.db.prepare(query).all(...params).map(a => this._parseActivity(a));
    }

    /**
     * Get activities for deal
     */
    getForDeal(dealId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        return db.db.prepare(`
            SELECT * FROM activities
            WHERE deal_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(dealId, limit, offset).map(a => this._parseActivity(a));
    }

    /**
     * Get recent activities (for dashboard)
     */
    getRecent(options = {}) {
        const { limit = 20, types = null } = options;

        let query = `
            SELECT a.*, c.name as contact_name, c.phone as contact_phone
            FROM activities a
            LEFT JOIN contacts c ON a.contact_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (types && types.length > 0) {
            query += ` AND a.type IN (${types.map(() => '?').join(',')})`;
            params.push(...types);
        }

        query += ' ORDER BY a.created_at DESC LIMIT ?';
        params.push(limit);

        return db.db.prepare(query).all(...params).map(a => this._parseActivity(a));
    }

    /**
     * Mark activity as completed
     */
    complete(id) {
        db.db.prepare(`
            UPDATE activities SET is_completed = 1, completed_at = ? WHERE id = ?
        `).run(new Date().toISOString(), id);
        return this.getById(id);
    }

    /**
     * Update activity
     */
    update(id, data) {
        const updates = [];
        const values = [];

        if (data.title !== undefined) {
            updates.push('title = ?');
            values.push(data.title);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }
        if (data.metadata !== undefined) {
            updates.push('metadata = ?');
            values.push(JSON.stringify(data.metadata));
        }
        if (data.is_completed !== undefined) {
            updates.push('is_completed = ?');
            values.push(data.is_completed ? 1 : 0);
            if (data.is_completed) {
                updates.push('completed_at = ?');
                values.push(new Date().toISOString());
            }
        }

        if (updates.length === 0) return this.getById(id);

        values.push(id);
        db.db.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Delete activity
     */
    delete(id) {
        db.db.prepare('DELETE FROM activities WHERE id = ?').run(id);
        return true;
    }

    /**
     * Get activity statistics
     */
    getStats(period = 7) {
        return db.db.prepare(`
            SELECT
                type,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM activities
            WHERE created_at >= date('now', '-' || ? || ' days')
            GROUP BY type, DATE(created_at)
            ORDER BY date DESC
        `).all(period);
    }

    /**
     * Parse activity from database
     */
    _parseActivity(activity) {
        return {
            ...activity,
            metadata: JSON.parse(activity.metadata || '{}'),
            is_completed: !!activity.is_completed
        };
    }
}

export default new ActivitiesManager();
