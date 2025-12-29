/**
 * Users Routes
 * User management (admin only for most operations)
 */

import { Router } from 'express';
import users from '../../crm/users.js';
import auth from '../../crm/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, validateEmail, sanitize } from '../middleware/validation.js';
import { success, created, notFound, error, forbidden } from '../utils/response.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';

const router = Router();

// GET /api/users - List users (manager+)
router.get('/',
    requireManager,
    asyncHandler(async (req, res) => {
        const { role, isActive, search } = req.query;
        const usersList = users.list({
            role,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : null,
            search
        });
        return success(res, usersList);
    })
);

// GET /api/users/stats - User statistics (admin)
router.get('/stats',
    requireAdmin,
    asyncHandler(async (req, res) => {
        const stats = users.getStats();
        return success(res, stats);
    })
);

// GET /api/users/:id - Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
    // Users can view themselves, managers+ can view anyone
    if (req.user.id !== req.params.id && !['admin', 'manager'].includes(req.user.role)) {
        return forbidden(res);
    }

    const user = users.getById(req.params.id);

    if (!user) {
        return notFound(res, 'Usuário');
    }

    return success(res, user);
}));

// POST /api/users - Create user (admin only)
router.post('/',
    requireAdmin,
    sanitize('name', 'email'),
    validateRequired('email', 'password', 'name'),
    validateEmail('email'),
    asyncHandler(async (req, res) => {
        // Check if email exists
        if (users.emailExists(req.body.email)) {
            return error(res, 'Email já cadastrado', 'DUPLICATE_EMAIL', 409);
        }

        const user = await users.create(req.body);
        return created(res, user);
    })
);

// PUT /api/users/:id - Update user
router.put('/:id',
    sanitize('name', 'email'),
    asyncHandler(async (req, res) => {
        // Users can update themselves (limited), admins can update anyone
        const isOwn = req.user.id === req.params.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwn && !isAdmin) {
            return forbidden(res);
        }

        // Non-admins can't change role
        if (!isAdmin && req.body.role) {
            delete req.body.role;
        }

        // Check email uniqueness
        if (req.body.email && users.emailExists(req.body.email, req.params.id)) {
            return error(res, 'Email já cadastrado', 'DUPLICATE_EMAIL', 409);
        }

        const user = await users.update(req.params.id, req.body);

        if (!user) {
            return notFound(res, 'Usuário');
        }

        return success(res, user);
    })
);

// PUT /api/users/:id/deactivate - Deactivate user (admin)
router.put('/:id/deactivate',
    requireAdmin,
    asyncHandler(async (req, res) => {
        if (req.user.id === req.params.id) {
            return error(res, 'Não pode desativar a si mesmo', 'SELF_DEACTIVATE', 400);
        }

        const user = users.deactivate(req.params.id);

        if (!user) {
            return notFound(res, 'Usuário');
        }

        // Logout all sessions
        auth.logoutAll(req.params.id);

        return success(res, user);
    })
);

// PUT /api/users/:id/activate - Activate user (admin)
router.put('/:id/activate',
    requireAdmin,
    asyncHandler(async (req, res) => {
        const user = users.activate(req.params.id);

        if (!user) {
            return notFound(res, 'Usuário');
        }

        return success(res, user);
    })
);

// POST /api/users/:id/reset-password - Reset password (admin)
router.post('/:id/reset-password',
    requireAdmin,
    validateRequired('newPassword'),
    asyncHandler(async (req, res) => {
        const { newPassword } = req.body;

        if (newPassword.length < 6) {
            return error(res, 'Senha deve ter pelo menos 6 caracteres', 'WEAK_PASSWORD', 400);
        }

        await auth.resetPassword(req.params.id, newPassword);
        return success(res, { message: 'Senha resetada com sucesso' });
    })
);

export default router;
