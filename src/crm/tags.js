/**
 * Tags Manager - CRM Tag Management
 * Handles tag creation, assignment, and filtering
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

class TagsManager {
    static CATEGORIES = {
        CONTACT: 'contact',
        DEAL: 'deal',
        ACTIVITY: 'activity',
        TASK: 'task'
    };

    static DEFAULT_COLORS = [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
        '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'
    ];

    /**
     * Create a new tag
     */
    create(data) {
        const id = data.id || `tag_${uuidv4().slice(0, 8)}`;

        db.db.prepare(`
            INSERT INTO tags (id, name, color, category, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            id,
            data.name,
            data.color || this.DEFAULT_COLORS[Math.floor(Math.random() * this.DEFAULT_COLORS.length)],
            data.category || 'contact',
            new Date().toISOString()
        );

        return this.getById(id);
    }

    /**
     * Get tag by ID
     */
    getById(id) {
        return db.db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    }

    /**
     * Get tag by name
     */
    getByName(name) {
        return db.db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
    }

    /**
     * Update tag
     */
    update(id, data) {
        const updates = [];
        const values = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.color !== undefined) {
            updates.push('color = ?');
            values.push(data.color);
        }
        if (data.category !== undefined) {
            updates.push('category = ?');
            values.push(data.category);
        }

        if (updates.length === 0) return this.getById(id);

        values.push(id);
        db.db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Delete tag
     */
    delete(id) {
        db.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
        return true;
    }

    /**
     * List all tags
     */
    list(category = null) {
        if (category) {
            return db.db.prepare(`
                SELECT * FROM tags WHERE category = ? ORDER BY name ASC
            `).all(category);
        }
        return db.db.prepare('SELECT * FROM tags ORDER BY category, name ASC').all();
    }

    /**
     * Get or create tag by name
     */
    getOrCreate(name, category = 'contact') {
        let tag = this.getByName(name);
        if (!tag) {
            tag = this.create({ name, category });
        }
        return tag;
    }

    /**
     * Get tag usage statistics
     */
    getUsageStats() {
        // Count contacts using each tag
        const contactTags = db.db.prepare(`
            SELECT tags FROM contacts WHERE tags != '[]'
        `).all();

        const tagCounts = {};

        for (const row of contactTags) {
            const tags = JSON.parse(row.tags || '[]');
            for (const tag of tags) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
        }

        // Get all tags with counts
        const allTags = this.list();
        return allTags.map(tag => ({
            ...tag,
            usage_count: tagCounts[tag.name] || 0
        })).sort((a, b) => b.usage_count - a.usage_count);
    }

    /**
     * Suggest tags based on content
     */
    suggestTags(content) {
        const keywords = {
            'quente': ['Hot'],
            'urgente': ['Urgente', 'Prioridade'],
            'vip': ['VIP'],
            'frio': ['Cold'],
            'interessado': ['Warm', 'Hot'],
            'follow': ['Follow-up'],
            'prioridade': ['Prioridade']
        };

        const suggestions = new Set();
        const lowerContent = content.toLowerCase();

        for (const [keyword, tags] of Object.entries(keywords)) {
            if (lowerContent.includes(keyword)) {
                tags.forEach(t => suggestions.add(t));
            }
        }

        return Array.from(suggestions);
    }
}

export default new TagsManager();
