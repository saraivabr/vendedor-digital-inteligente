/**
 * Authentication Middleware
 * JWT verification for protected routes
 */

import auth from '../../crm/auth.js';

/**
 * Require authentication
 */
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Token não fornecido',
            code: 'NO_TOKEN'
        });
    }

    // Support both "Bearer <token>" and just "<token>"
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    const verification = auth.verifyToken(token);

    if (!verification.valid) {
        return res.status(401).json({
            error: verification.error,
            code: 'INVALID_TOKEN'
        });
    }

    // Attach user to request
    req.user = verification.user;
    req.token = token;

    next();
}

/**
 * Optional authentication (attach user if token present)
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        const verification = auth.verifyToken(token);

        if (verification.valid) {
            req.user = verification.user;
            req.token = token;
        }
    }

    next();
}

/**
 * Require specific role
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Não autenticado',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Sem permissão para esta ação',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require manager or admin role
 */
export const requireManager = requireRole('admin', 'manager');
