/**
 * Permissions Manager - CRM Access Control
 * Handles role-based permissions (RBAC)
 */

import db from '../database/db.js';

class PermissionsManager {
    static RESOURCES = {
        CONTACTS: 'contacts',
        DEALS: 'deals',
        TASKS: 'tasks',
        REPORTS: 'reports',
        SETTINGS: 'settings',
        USERS: 'users'
    };

    static ACTIONS = {
        READ: 'read',
        WRITE: 'write',
        DELETE: 'delete',
        ASSIGN: 'assign'
    };

    /**
     * Check if role has permission
     */
    hasPermission(role, resource, action) {
        const permission = db.db.prepare(`
            SELECT * FROM permissions
            WHERE role = ? AND resource = ? AND action = ?
        `).get(role, resource, action);

        return !!permission;
    }

    /**
     * Check if user can perform action
     */
    canUser(user, resource, action) {
        return this.hasPermission(user.role, resource, action);
    }

    /**
     * Get all permissions for role
     */
    getPermissionsForRole(role) {
        return db.db.prepare(`
            SELECT resource, action FROM permissions WHERE role = ?
        `).all(role);
    }

    /**
     * Get permissions grouped by resource
     */
    getPermissionsMatrix(role) {
        const permissions = this.getPermissionsForRole(role);
        const matrix = {};

        for (const perm of permissions) {
            if (!matrix[perm.resource]) {
                matrix[perm.resource] = [];
            }
            matrix[perm.resource].push(perm.action);
        }

        return matrix;
    }

    /**
     * Grant permission
     */
    grantPermission(role, resource, action) {
        const id = `perm_${role}_${resource}_${action}`;

        db.db.prepare(`
            INSERT OR IGNORE INTO permissions (id, role, resource, action)
            VALUES (?, ?, ?, ?)
        `).run(id, role, resource, action);

        return true;
    }

    /**
     * Revoke permission
     */
    revokePermission(role, resource, action) {
        db.db.prepare(`
            DELETE FROM permissions WHERE role = ? AND resource = ? AND action = ?
        `).run(role, resource, action);

        return true;
    }

    /**
     * Set permissions for role (replace all)
     */
    setPermissions(role, permissions) {
        db.db.transaction(() => {
            // Remove existing
            db.db.prepare('DELETE FROM permissions WHERE role = ?').run(role);

            // Add new
            const stmt = db.db.prepare(`
                INSERT INTO permissions (id, role, resource, action) VALUES (?, ?, ?, ?)
            `);

            for (const perm of permissions) {
                const id = `perm_${role}_${perm.resource}_${perm.action}`;
                stmt.run(id, role, perm.resource, perm.action);
            }
        })();

        return this.getPermissionsForRole(role);
    }

    /**
     * Get all roles with their permissions
     */
    getAllRolesPermissions() {
        const roles = ['admin', 'manager', 'agent'];
        const result = {};

        for (const role of roles) {
            result[role] = this.getPermissionsMatrix(role);
        }

        return result;
    }

    /**
     * Check ownership (for resource-level access)
     */
    isOwner(user, resourceType, resourceId) {
        switch (resourceType) {
            case 'deal':
                const deal = db.db.prepare('SELECT assigned_to FROM deals WHERE id = ?').get(resourceId);
                return deal && deal.assigned_to === user.id;

            case 'task':
                const task = db.db.prepare('SELECT assigned_to FROM tasks WHERE id = ?').get(resourceId);
                return task && task.assigned_to === user.id;

            default:
                return false;
        }
    }

    /**
     * Filter resources by access level
     */
    filterByAccess(user, resources, resourceType) {
        // Admins and managers see everything
        if (user.role === 'admin' || user.role === 'manager') {
            return resources;
        }

        // Agents see only their assigned resources
        return resources.filter(r =>
            r.assigned_to === user.id || r.assigned_to === null
        );
    }

    /**
     * Middleware factory for Express
     */
    requirePermission(resource, action) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Não autenticado' });
            }

            if (!this.hasPermission(req.user.role, resource, action)) {
                return res.status(403).json({ error: 'Sem permissão para esta ação' });
            }

            next();
        };
    }
}

export default new PermissionsManager();
