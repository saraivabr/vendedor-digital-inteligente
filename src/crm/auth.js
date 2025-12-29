/**
 * Auth Manager - CRM Authentication
 * Handles login, sessions, and JWT tokens
 */

import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import users from './users.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vendedor-digital-secret-key-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthManager {
    /**
     * Login with email and password
     */
    async login(email, password) {
        const user = users.getByEmail(email);

        if (!user) {
            return { success: false, error: 'Credenciais inválidas' };
        }

        if (!user.is_active) {
            return { success: false, error: 'Usuário desativado' };
        }

        const validPassword = await users.verifyPassword(user, password);
        if (!validPassword) {
            return { success: false, error: 'Credenciais inválidas' };
        }

        // Generate token
        const token = this.generateToken(user);

        // Create session
        const session = this.createSession(user.id, token);

        // Update last login
        users.updateLastLogin(user.id);

        return {
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_url: user.avatar_url
            },
            expiresAt: session.expires_at
        };
    }

    /**
     * Logout (invalidate session)
     */
    logout(token) {
        db.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return { success: true };
    }

    /**
     * Logout all sessions for user
     */
    logoutAll(userId) {
        db.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
        return { success: true };
    }

    /**
     * Verify token
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Check if session exists and is valid
            const session = db.db.prepare(`
                SELECT * FROM sessions
                WHERE token = ? AND expires_at > datetime('now')
            `).get(token);

            if (!session) {
                return { valid: false, error: 'Sessão expirada ou inválida' };
            }

            // Get user
            const user = users.getById(decoded.userId);
            if (!user || !user.is_active) {
                return { valid: false, error: 'Usuário não encontrado ou desativado' };
            }

            return { valid: true, user, decoded };
        } catch (error) {
            return { valid: false, error: 'Token inválido' };
        }
    }

    /**
     * Generate JWT token
     */
    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    /**
     * Create session
     */
    createSession(userId, token) {
        const id = uuidv4();
        const now = new Date();

        // Parse JWT_EXPIRES_IN to get expiration
        const expiresAt = new Date(now.getTime() + this.parseExpiration(JWT_EXPIRES_IN));

        db.db.prepare(`
            INSERT INTO sessions (id, user_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, userId, token, expiresAt.toISOString(), now.toISOString());

        return { id, user_id: userId, token, expires_at: expiresAt.toISOString() };
    }

    /**
     * Parse expiration string (e.g., '7d', '24h', '30m')
     */
    parseExpiration(exp) {
        const unit = exp.slice(-1);
        const value = parseInt(exp.slice(0, -1));

        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            default: return 7 * 24 * 60 * 60 * 1000; // 7 days default
        }
    }

    /**
     * Refresh token
     */
    async refreshToken(oldToken) {
        const verification = this.verifyToken(oldToken);

        if (!verification.valid) {
            return { success: false, error: verification.error };
        }

        // Delete old session
        db.db.prepare('DELETE FROM sessions WHERE token = ?').run(oldToken);

        // Generate new token
        const newToken = this.generateToken(verification.user);
        const session = this.createSession(verification.user.id, newToken);

        return {
            success: true,
            token: newToken,
            expiresAt: session.expires_at
        };
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        const validPassword = await users.verifyPassword(user, currentPassword);
        if (!validPassword) {
            return { success: false, error: 'Senha atual incorreta' };
        }

        await users.update(userId, { password: newPassword });

        // Invalidate all sessions
        this.logoutAll(userId);

        return { success: true };
    }

    /**
     * Reset password (admin function)
     */
    async resetPassword(userId, newPassword) {
        await users.update(userId, { password: newPassword });
        this.logoutAll(userId);
        return { success: true };
    }

    /**
     * Clean expired sessions
     */
    cleanExpiredSessions() {
        const result = db.db.prepare(`
            DELETE FROM sessions WHERE expires_at < datetime('now')
        `).run();
        return result.changes;
    }

    /**
     * Get active sessions for user
     */
    getActiveSessions(userId) {
        return db.db.prepare(`
            SELECT id, created_at, expires_at
            FROM sessions
            WHERE user_id = ? AND expires_at > datetime('now')
            ORDER BY created_at DESC
        `).all(userId);
    }
}

export default new AuthManager();
