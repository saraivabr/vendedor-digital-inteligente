/**
 * Contacts Manager - CRM Contact Management
 * Handles all contact-related operations
 */

import { v4 as uuidv4 } from 'uuid';
import dbService from '../database/db.js';

class ContactsManager {
    constructor(customDb = null) {
        this.db = customDb || dbService.db;
    }
    /**
     * Create a new contact
     */
    create(data) {
        const id = data.id || uuidv4();
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO contacts (
                id, phone, name, email, company_name, company_size,
                industry, position, city, state, timezone, source,
                tags, custom_fields, avatar_url, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            data.phone,
            data.name || null,
            data.email || null,
            data.company_name || null,
            data.company_size || null,
            data.industry || null,
            data.position || null,
            data.city || null,
            data.state || null,
            data.timezone || 'America/Sao_Paulo',
            data.source || 'whatsapp',
            JSON.stringify(data.tags || []),
            JSON.stringify(data.custom_fields || {}),
            data.avatar_url || null,
            data.notes || null,
            now,
            now
        );

        return this.getById(id);
    }

    /**
     * Get contact by ID
     */
    getById(id) {
        const contact = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        return contact ? this._parseContact(contact) : null;
    }

    /**
     * Get contact by phone
     */
    getByPhone(phone) {
        const contact = this.db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phone);
        return contact ? this._parseContact(contact) : null;
    }

    /**
     * Update contact
     */
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const updates = [];
        const values = [];

        const fields = [
            'name', 'email', 'company_name', 'company_size', 'industry',
            'position', 'city', 'state', 'timezone', 'source', 'avatar_url', 'notes'
        ];

        for (const field of fields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        // Handle JSON fields
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

        this.db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Delete contact (soft delete by archiving)
     */
    delete(id) {
        // Archive instead of delete - move to archived status
        this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
        return true;
    }

    /**
     * List contacts with pagination and filters
     */
    list(options = {}) {
        const {
            page = 1,
            limit = 50,
            search = null,
            tags = null,
            source = null,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        let query = 'SELECT * FROM contacts WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR company_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (source) {
            query += ' AND source = ?';
            params.push(source);
        }

        if (tags && tags.length > 0) {
            // Filter by tags (stored as JSON array)
            for (const tag of tags) {
                query += ' AND tags LIKE ?';
                params.push(`%"${tag}"%`);
            }
        }

        // Count total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const { total } = this.db.prepare(countQuery).get(...params);

        // Add sorting and pagination
        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(limit, (page - 1) * limit);

        const contacts = this.db.prepare(query).all(...params);

        return {
            data: contacts.map(c => this._parseContact(c)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Search contacts (convenience method)
     */
    search(query) {
        return this.list({ search: query, limit: 100 });
    }

    /**
     * Add tags to contact
     */
    addTags(id, newTags) {
        const contact = this.getById(id);
        if (!contact) return null;

        const tags = [...new Set([...contact.tags, ...newTags])];
        return this.update(id, { tags });
    }

    /**
     * Remove tags from contact
     */
    removeTags(id, tagsToRemove) {
        const contact = this.getById(id);
        if (!contact) return null;

        const tags = contact.tags.filter(t => !tagsToRemove.includes(t));
        return this.update(id, { tags });
    }

    /**
     * Get or create contact by phone
     */
    getOrCreate(phone, data = {}) {
        let contact = this.getByPhone(phone);
        if (!contact) {
            contact = this.create({ phone, ...data });
        }
        return contact;
    }

    /**
     * Get contact timeline (activities)
     */
    getTimeline(contactId, limit = 50) {
        return this.db.prepare(`
            SELECT * FROM activities
            WHERE contact_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(contactId, limit);
    }

    /**
     * Get contact deals
     */
    getDeals(contactId) {
        return this.db.prepare(`
            SELECT * FROM deals
            WHERE contact_id = ?
            ORDER BY created_at DESC
        `).all(contactId);
    }

    /**
     * Parse contact from database
     */
    _parseContact(contact) {
        return {
            ...contact,
            tags: JSON.parse(contact.tags || '[]'),
            custom_fields: JSON.parse(contact.custom_fields || '{}')
        };
    }

    /**
     * Get contact statistics
     */
    getStats() {
        const stats = this.db.prepare(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as last_7_days,
                COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as last_30_days,
                COUNT(DISTINCT source) as sources
            FROM contacts
        `).get();

        const bySource = this.db.prepare(`
            SELECT source, COUNT(*) as count
            FROM contacts
            GROUP BY source
        `).all();

        return { ...stats, bySource };
    }
}

// Export singleton instance for normal use
export default new ContactsManager();

// Export class for testing
export { ContactsManager };
