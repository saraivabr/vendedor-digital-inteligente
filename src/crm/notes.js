/**
 * Notes Manager - CRM Notes Management
 * Handles internal notes for contacts and deals
 */

import db from '../database/db.js';

class NotesManager {
    /**
     * Generate unique note ID
     */
    _generateId() {
        return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a new note
     */
    create(data) {
        const id = this._generateId();
        const now = new Date().toISOString();

        db.db.prepare(`
            INSERT INTO notes (
                id, contact_id, deal_id, content, is_pinned, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.contact_id || null,
            data.deal_id || null,
            data.content,
            data.is_pinned ? 1 : 0,
            data.created_by || 'system',
            now,
            now
        );

        return this.getById(id);
    }

    /**
     * Get note by ID
     */
    getById(id) {
        const note = db.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        return note ? { ...note, is_pinned: !!note.is_pinned } : null;
    }

    /**
     * Update note
     */
    update(id, data) {
        const updates = [];
        const values = [];

        if (data.content !== undefined) {
            updates.push('content = ?');
            values.push(data.content);
        }
        if (data.is_pinned !== undefined) {
            updates.push('is_pinned = ?');
            values.push(data.is_pinned ? 1 : 0);
        }

        if (updates.length === 0) return this.getById(id);

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Delete note
     */
    delete(id) {
        db.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
        return true;
    }

    /**
     * Toggle pin status
     */
    togglePin(id) {
        const note = this.getById(id);
        if (!note) return null;
        return this.update(id, { is_pinned: !note.is_pinned });
    }

    /**
     * Get notes for contact
     */
    getForContact(contactId, options = {}) {
        const { limit = 50, pinnedFirst = true } = options;

        const orderBy = pinnedFirst
            ? 'is_pinned DESC, created_at DESC'
            : 'created_at DESC';

        return db.db.prepare(`
            SELECT * FROM notes
            WHERE contact_id = ?
            ORDER BY ${orderBy}
            LIMIT ?
        `).all(contactId, limit).map(n => ({ ...n, is_pinned: !!n.is_pinned }));
    }

    /**
     * Get notes for deal
     */
    getForDeal(dealId, options = {}) {
        const { limit = 50 } = options;

        return db.db.prepare(`
            SELECT * FROM notes
            WHERE deal_id = ?
            ORDER BY is_pinned DESC, created_at DESC
            LIMIT ?
        `).all(dealId, limit).map(n => ({ ...n, is_pinned: !!n.is_pinned }));
    }

    /**
     * Get pinned notes for contact
     */
    getPinnedForContact(contactId) {
        return db.db.prepare(`
            SELECT * FROM notes
            WHERE contact_id = ? AND is_pinned = 1
            ORDER BY created_at DESC
        `).all(contactId).map(n => ({ ...n, is_pinned: true }));
    }

    /**
     * Search notes
     */
    search(query, options = {}) {
        const { limit = 20 } = options;

        return db.db.prepare(`
            SELECT n.*, c.name as contact_name
            FROM notes n
            LEFT JOIN contacts c ON n.contact_id = c.id
            WHERE n.content LIKE ?
            ORDER BY n.created_at DESC
            LIMIT ?
        `).all(`%${query}%`, limit).map(n => ({ ...n, is_pinned: !!n.is_pinned }));
    }
}

export default new NotesManager();
