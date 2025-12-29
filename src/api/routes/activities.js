/**
 * Activities Routes
 * Activity tracking and timeline
 */

import { Router } from 'express';
import activities from '../../crm/activities.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, validatePagination } from '../middleware/validation.js';
import { success, created, paginated, notFound } from '../utils/response.js';

const router = Router();

// GET /api/activities - List recent activities
router.get('/',
    validatePagination,
    asyncHandler(async (req, res) => {
        const { types } = req.query;
        const limit = parseInt(req.query.limit) || 50;

        const result = activities.getRecent({
            limit,
            types: types ? types.split(',') : null
        });

        return success(res, result);
    })
);

// GET /api/activities/stats - Get activity statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const period = parseInt(req.query.period) || 7;
    const stats = activities.getStats(period);
    return success(res, stats);
}));

// GET /api/activities/:id - Get activity by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const activity = activities.getById(req.params.id);

    if (!activity) {
        return notFound(res, 'Atividade');
    }

    return success(res, activity);
}));

// POST /api/activities - Log activity
router.post('/',
    validateRequired('type'),
    asyncHandler(async (req, res) => {
        const activity = activities.log(req.body);
        return created(res, activity);
    })
);

// PUT /api/activities/:id - Update activity
router.put('/:id', asyncHandler(async (req, res) => {
    const activity = activities.update(req.params.id, req.body);

    if (!activity) {
        return notFound(res, 'Atividade');
    }

    return success(res, activity);
}));

// PUT /api/activities/:id/complete - Mark as completed
router.put('/:id/complete', asyncHandler(async (req, res) => {
    const activity = activities.complete(req.params.id);

    if (!activity) {
        return notFound(res, 'Atividade');
    }

    return success(res, activity);
}));

// DELETE /api/activities/:id - Delete activity
router.delete('/:id', asyncHandler(async (req, res) => {
    const activity = activities.getById(req.params.id);

    if (!activity) {
        return notFound(res, 'Atividade');
    }

    activities.delete(req.params.id);
    return success(res, { message: 'Atividade removida' });
}));

export default router;
