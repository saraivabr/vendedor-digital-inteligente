/**
 * Tasks Routes
 * Task and reminder management
 */

import { Router } from 'express';
import tasks from '../../crm/tasks.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, validateEnum, validatePagination, sanitize } from '../middleware/validation.js';
import { success, created, paginated, notFound } from '../utils/response.js';

const router = Router();

// GET /api/tasks - List tasks
router.get('/',
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const { status, type, priority, assignedTo, contactId, dealId, dueBefore, dueAfter } = req.query;

        const result = tasks.list({
            page,
            limit,
            status: status ? status.split(',') : null,
            type,
            priority,
            assignedTo,
            contactId,
            dealId,
            dueBefore,
            dueAfter
        });

        return paginated(res, result.data, result.pagination);
    })
);

// GET /api/tasks/overdue - Get overdue tasks
router.get('/overdue', asyncHandler(async (req, res) => {
    const result = tasks.getOverdue();
    return success(res, result);
}));

// GET /api/tasks/today - Get tasks due today
router.get('/today', asyncHandler(async (req, res) => {
    const result = tasks.getDueToday();
    return success(res, result);
}));

// GET /api/tasks/upcoming - Get upcoming tasks
router.get('/upcoming', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const result = tasks.getUpcoming(days);
    return success(res, result);
}));

// GET /api/tasks/stats - Get task statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = tasks.getStats();
    return success(res, stats);
}));

// GET /api/tasks/:id - Get task by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const task = tasks.getById(req.params.id);

    if (!task) {
        return notFound(res, 'Tarefa');
    }

    return success(res, task);
}));

// POST /api/tasks - Create task
router.post('/',
    sanitize('title', 'description'),
    validateRequired('title'),
    asyncHandler(async (req, res) => {
        const task = tasks.create(req.body);
        return created(res, task);
    })
);

// PUT /api/tasks/:id - Update task
router.put('/:id',
    sanitize('title', 'description'),
    asyncHandler(async (req, res) => {
        const task = tasks.update(req.params.id, req.body);

        if (!task) {
            return notFound(res, 'Tarefa');
        }

        return success(res, task);
    })
);

// PUT /api/tasks/:id/complete - Complete task
router.put('/:id/complete', asyncHandler(async (req, res) => {
    const task = tasks.complete(req.params.id);

    if (!task) {
        return notFound(res, 'Tarefa');
    }

    return success(res, task);
}));

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', asyncHandler(async (req, res) => {
    const task = tasks.getById(req.params.id);

    if (!task) {
        return notFound(res, 'Tarefa');
    }

    tasks.delete(req.params.id);
    return success(res, { message: 'Tarefa removida' });
}));

export default router;
