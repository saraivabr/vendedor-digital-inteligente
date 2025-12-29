/**
 * Users Manager - CRM User Management
 * Handles user accounts and profiles
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../database/db.js';

class UsersManager {
    static ROLES = {
        ADMIN: 'admin',
        MANAGER: 'manager',
        AGENT: 'agent'
    };

    /**
     * Create a new user
     */
    async create(data) {
        const id = uuidv4();
        const now = new Date().toISOString();

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);

        db.db.prepare(`
            INSERT INTO users (
                id, email, password_hash, name, role, avatar_url,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.email.toLowerCase(),
            passwordHash,
            data.name,
            data.role || 'agent',
            data.avatar_url || null,
            1,
            now,
            now
        );

        return this.getById(id);
    }

    /**
     * Get user by ID (without password)
     */
    getById(id) {
        const user = db.db.prepare(`
            SELECT id, email, name, role, avatar_url, is_active,
                   last_login_at, created_at, updated_at
            FROM users WHERE id = ?
        `).get(id);
        return user || null;
    }

    /**
     * Get user by email
     */
    getByEmail(email) {
        return db.db.prepare(`
            SELECT * FROM users WHERE email = ?
        `).get(email.toLowerCase());
    }

    /**
     * Verify password
     */
    async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password_hash);
    }

    /**
     * Update user
     */
    async update(id, data) {
        const updates = [];
        const values = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.email !== undefined) {
            updates.push('email = ?');
            values.push(data.email.toLowerCase());
        }
        if (data.role !== undefined) {
            updates.push('role = ?');
            values.push(data.role);
        }
        if (data.avatar_url !== undefined) {
            updates.push('avatar_url = ?');
            values.push(data.avatar_url);
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(data.is_active ? 1 : 0);
        }
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(data.password, salt);
            updates.push('password_hash = ?');
            values.push(passwordHash);
        }

        if (updates.length === 0) return this.getById(id);

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    }

    /**
     * Update last login
     */
    updateLastLogin(id) {
        db.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
            .run(new Date().toISOString(), id);
    }

    /**
     * Deactivate user
     */
    deactivate(id) {
        return this.update(id, { is_active: false });
    }

    /**
     * Activate user
     */
    activate(id) {
        return this.update(id, { is_active: true });
    }

    /**
     * Delete user (soft delete by deactivating)
     */
    delete(id) {
        // Soft delete - just deactivate
        return this.deactivate(id);
    }

    /**
     * Hard delete user (use with caution)
     */
    hardDelete(id) {
        // Delete sessions first
        db.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        db.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return true;
    }

    /**
     * List users
     */
    list(options = {}) {
        const { role = null, isActive = null, search = null } = options;

        let query = `
            SELECT id, email, name, role, avatar_url, is_active,
                   last_login_at, created_at, updated_at
            FROM users WHERE 1=1
        `;
        const params = [];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        if (isActive !== null) {
            query += ' AND is_active = ?';
            params.push(isActive ? 1 : 0);
        }

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY name ASC';

        return db.db.prepare(query).all(...params);
    }

    /**
     * Get user statistics
     */
    getStats() {
        return db.db.prepare(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
                COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
                COUNT(CASE WHEN role = 'agent' THEN 1 END) as agents
            FROM users
        `).get();
    }

    /**
     * Check if email exists
     */
    emailExists(email, excludeId = null) {
        let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
        const params = [email.toLowerCase()];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = db.db.prepare(query).get(...params);
        return result.count > 0;
    }

    /**
     * Create default admin user if none exists
     */
    async ensureAdminExists() {
        const admins = db.db.prepare(
            'SELECT COUNT(*) as count FROM users WHERE role = ?'
        ).get('admin');

        if (admins.count === 0) {
            console.log('📌 Creating default admin user...');
            await this.create({
                email: 'admin@saraiva.ai',
                password: 'admin123', // Change this!
                name: 'Administrador',
                role: 'admin'
            });
            console.log('✅ Default admin created (admin@saraiva.ai / admin123)');
            console.log('⚠️  IMPORTANT: Change the default password!');
        }
    }
}

export default new UsersManager();
