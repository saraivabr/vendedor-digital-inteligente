/**
 * Deals Routes
 * Sales opportunity management
 */

import { Router } from 'express';
import deals from '../../crm/deals.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, validateEnum, validatePagination, sanitize } from '../middleware/validation.js';
import { success, created, paginated, notFound, error } from '../utils/response.js';

const router = Router();

// GET /api/deals - List deals
router.get('/',
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const { pipeline, stage, assignedTo, priority, search, sortBy, sortOrder } = req.query;

        const result = deals.list({
            page,
            limit,
            pipeline: pipeline || 'default',
            stage,
            assignedTo,
            priority,
            search,
            sortBy: sortBy || 'created_at',
            sortOrder: sortOrder || 'DESC'
        });

        return paginated(res, result.data, result.pagination);
    })
);

// GET /api/deals/kanban - Get deals by stage (kanban view)
router.get('/kanban', asyncHandler(async (req, res) => {
    const pipeline = req.query.pipeline || 'default';
    const result = deals.getByStage(pipeline);
    return success(res, result);
}));

// GET /api/deals/stats - Get pipeline statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const pipeline = req.query.pipeline || 'default';
    const stats = deals.getPipelineStats(pipeline);
    return success(res, stats);
}));

// GET /api/deals/:id - Get deal by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const deal = deals.getById(req.params.id);

    if (!deal) {
        return notFound(res, 'Deal');
    }

    return success(res, deal);
}));

// POST /api/deals - Create deal
router.post('/',
    sanitize('title'),
    validateRequired('contact_id'),
    asyncHandler(async (req, res) => {
        const deal = deals.create(req.body);
        return created(res, deal);
    })
);

// PUT /api/deals/:id - Update deal
router.put('/:id',
    sanitize('title'),
    asyncHandler(async (req, res) => {
        const deal = deals.update(req.params.id, req.body);

        if (!deal) {
            return notFound(res, 'Deal');
        }

        return success(res, deal);
    })
);

// PUT /api/deals/:id/stage - Move to stage
router.put('/:id/stage',
    validateRequired('stage'),
    asyncHandler(async (req, res) => {
        const { stage } = req.body;

        const deal = deals.moveToStage(req.params.id, stage);

        if (!deal) {
            return notFound(res, 'Deal');
        }

        return success(res, deal);
    })
);

// PUT /api/deals/:id/won - Mark as won
router.put('/:id/won', asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const deal = deals.markAsWon(req.params.id, reason);

    if (!deal) {
        return notFound(res, 'Deal');
    }

    return success(res, deal);
}));

// PUT /api/deals/:id/lost - Mark as lost
router.put('/:id/lost', asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const deal = deals.markAsLost(req.params.id, reason);

    if (!deal) {
        return notFound(res, 'Deal');
    }

    return success(res, deal);
}));

// DELETE /api/deals/:id - Delete deal
router.delete('/:id', asyncHandler(async (req, res) => {
    const deal = deals.getById(req.params.id);

    if (!deal) {
        return notFound(res, 'Deal');
    }

    deals.delete(req.params.id);
    return success(res, { message: 'Deal removido' });
}));

export default router;
