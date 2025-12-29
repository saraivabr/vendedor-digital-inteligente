/**
 * Auth Routes
 * Login, logout, token refresh
 */

import { Router } from 'express';
import auth from '../../crm/auth.js';
import users from '../../crm/users.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, validateEmail, sanitize } from '../middleware/validation.js';
import { success, error } from '../utils/response.js';

const router = Router();

// POST /api/auth/login
router.post('/login',
    sanitize('email', 'password'),
    validateRequired('email', 'password'),
    validateEmail('email'),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const result = await auth.login(email, password);

        if (!result.success) {
            return error(res, result.error, 'AUTH_FAILED', 401);
        }

        return success(res, {
            token: result.token,
            user: result.user,
            expiresAt: result.expiresAt
        });
    })
);

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        auth.logout(token);
    }

    return success(res, { message: 'Logout realizado com sucesso' });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return error(res, 'Token não fornecido', 'NO_TOKEN', 401);
    }

    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    const result = await auth.refreshToken(token);

    if (!result.success) {
        return error(res, result.error, 'REFRESH_FAILED', 401);
    }

    return success(res, {
        token: result.token,
        expiresAt: result.expiresAt
    });
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return error(res, 'Token não fornecido', 'NO_TOKEN', 401);
    }

    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    const verification = auth.verifyToken(token);

    if (!verification.valid) {
        return error(res, verification.error, 'INVALID_TOKEN', 401);
    }

    return success(res, { user: verification.user });
}));

// POST /api/auth/change-password
router.post('/change-password',
    validateRequired('currentPassword', 'newPassword'),
    asyncHandler(async (req, res) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return error(res, 'Token não fornecido', 'NO_TOKEN', 401);
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        const verification = auth.verifyToken(token);

        if (!verification.valid) {
            return error(res, verification.error, 'INVALID_TOKEN', 401);
        }

        const { currentPassword, newPassword } = req.body;

        if (newPassword.length < 6) {
            return error(res, 'Nova senha deve ter pelo menos 6 caracteres', 'WEAK_PASSWORD', 400);
        }

        const result = await auth.changePassword(
            verification.user.id,
            currentPassword,
            newPassword
        );

        if (!result.success) {
            return error(res, result.error, 'CHANGE_FAILED', 400);
        }

        return success(res, { message: 'Senha alterada com sucesso' });
    })
);

export default router;
