/**
 * Tasks Manager - CRM Task Management
 * Handles tasks, reminders, and follow-up scheduling
 */

import db from '../database/db.js';

class TasksManager {
    static STATUS = {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    };

    static TYPES = {
        TASK: 'task',
        REMINDER: 'reminder',
        FOLLOW_UP: 'follow_up'
    };

    static PRIORITIES = {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        URGENT: 'urgent'
    };

    /**
     * Generate unique task ID
     */
    _generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a new task
     */
    create(data) {
        const id = this._generateId();
        const now = new Date().toISOString();

        db.db.prepare(`
            INSERT INTO tasks (
                id, contact_id, deal_id, title, description, type,
                priority, status, due_date, due_time, reminder_at,
                assigned_to, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.contact_id || null,
            data.deal_id || null,
            data.title,
            data.description || null,
            data.type || 'task',
            data.priority || 'medium',
            'pending',
            data.due_date || null,
            data.due_time || null,
            data.reminder_at || null,
            data.assigned_to || null,
            now
        );

        return this.getById(id);
    }

    /**
     * Create follow-up task
     */
    createFollowUp(contactId, dealId, dueDate, notes = null) {
        return this.create({
            contact_id: contactId,
            deal_id: dealId,
            title: 'Follow-up com lead',
            description: notes,
            type: 'follow_up',
            priority: 'high',
            due_date: dueDate
        });
    }

    /**
     * Get task by ID
     */
    getById(id) {
        const task = db.db.prepare(`
            SELECT t.*, c.name as contact_name, c.phone as contact_phone
            FROM tasks t
            LEFT JOIN contacts c ON t.contact_id = c.id
            WHERE t.id = ?
        `).get(id);
        return task || null;
    }

    /**
     * Update task
     */
    update(id, data) {
        const updates = [];
        const values = [];

        const fields = ['title', 'description', 'type', 'priority', 'status',
                       'due_date', 'due_time', 'reminder_at', 'assigned_to'];

        for (const field of fields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (updates.length === 0) return this.getById(id);

        values.push(id);
        db.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Complete task
     */
    complete(id) {
        db.db.prepare(`
            UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?
        `).run(new Date().toISOString(), id);
        return this.getById(id);
    }

    /**
     * Cancel task
     */
    cancel(id) {
        return this.update(id, { status: 'cancelled' });
    }

    /**
     * Delete task
     */
    delete(id) {
        db.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        return true;
    }

    /**
     * List tasks with filters
     */
    list(options = {}) {
        const {
            page = 1,
            limit = 50,
            status = null,
            type = null,
            priority = null,
            assignedTo = null,
            contactId = null,
            dealId = null,
            dueBefore = null,
            dueAfter = null,
            sortBy = 'due_date',
            sortOrder = 'ASC'
        } = options;

        let query = `
            SELECT t.*, c.name as contact_name, c.phone as contact_phone
            FROM tasks t
            LEFT JOIN contacts c ON t.contact_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            if (Array.isArray(status)) {
                query += ` AND t.status IN (${status.map(() => '?').join(',')})`;
                params.push(...status);
            } else {
                query += ' AND t.status = ?';
                params.push(status);
            }
        }

        if (type) {
            query += ' AND t.type = ?';
            params.push(type);
        }

        if (priority) {
            query += ' AND t.priority = ?';
            params.push(priority);
        }

        if (assignedTo) {
            query += ' AND t.assigned_to = ?';
            params.push(assignedTo);
        }

        if (contactId) {
            query += ' AND t.contact_id = ?';
            params.push(contactId);
        }

        if (dealId) {
            query += ' AND t.deal_id = ?';
            params.push(dealId);
        }

        if (dueBefore) {
            query += ' AND t.due_date <= ?';
            params.push(dueBefore);
        }

        if (dueAfter) {
            query += ' AND t.due_date >= ?';
            params.push(dueAfter);
        }

        // Count
        const countQuery = query.replace(/SELECT t\.\*, c\.name as contact_name, c\.phone as contact_phone/, 'SELECT COUNT(*) as total');
        const { total } = db.db.prepare(countQuery).get(...params);

        query += ` ORDER BY t.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(limit, (page - 1) * limit);

        const tasks = db.db.prepare(query).all(...params);

        return {
            data: tasks,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get overdue tasks
     */
    getOverdue() {
        const today = new Date().toISOString().split('T')[0];
        return db.db.prepare(`
            SELECT t.*, c.name as contact_name, c.phone as contact_phone
            FROM tasks t
            LEFT JOIN contacts c ON t.contact_id = c.id
            WHERE t.status = 'pending' AND t.due_date < ?
            ORDER BY t.due_date ASC
        `).all(today);
    }

    /**
     * Get tasks due today
     */
    getDueToday() {
        const today = new Date().toISOString().split('T')[0];
        return db.db.prepare(`
            SELECT t.*, c.name as contact_name, c.phone as contact_phone
            FROM tasks t
            LEFT JOIN contacts c ON t.contact_id = c.id
            WHERE t.status = 'pending' AND t.due_date = ?
            ORDER BY t.due_time ASC
        `).all(today);
    }

    /**
     * Get upcoming tasks
     */
    getUpcoming(days = 7) {
        return db.db.prepare(`
            SELECT t.*, c.name as contact_name, c.phone as contact_phone
            FROM tasks t
            LEFT JOIN contacts c ON t.contact_id = c.id
            WHERE t.status = 'pending'
              AND t.due_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
            ORDER BY t.due_date ASC, t.due_time ASC
        `).all(days);
    }

    /**
     * Get task statistics
     */
    getStats() {
        return db.db.prepare(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'pending' AND due_date < date('now') THEN 1 END) as overdue,
                COUNT(CASE WHEN status = 'pending' AND due_date = date('now') THEN 1 END) as due_today
            FROM tasks
        `).get();
    }
}

export default new TasksManager();
