/**
 * Pipeline Routes
 * Sales pipeline stages management
 */

import { Router } from 'express';
import pipeline from '../../crm/pipeline.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, sanitize } from '../middleware/validation.js';
import { success, created, notFound, error } from '../utils/response.js';
import { requireManager } from '../middleware/auth.js';

const router = Router();

// GET /api/pipeline - Get pipeline stages
router.get('/', asyncHandler(async (req, res) => {
    const pipelineName = req.query.pipeline || 'default';
    const stages = pipeline.getStages(pipelineName);
    return success(res, stages);
}));

// GET /api/pipeline/summary - Get pipeline summary with deals
router.get('/summary', asyncHandler(async (req, res) => {
    const pipelineName = req.query.pipeline || 'default';
    const summary = pipeline.getPipelineSummary(pipelineName);
    return success(res, summary);
}));

// GET /api/pipeline/all - Get all pipelines
router.get('/all', asyncHandler(async (req, res) => {
    const pipelines = pipeline.getPipelines();
    return success(res, pipelines);
}));

// POST /api/pipeline/stages - Create stage (manager+)
router.post('/stages',
    requireManager,
    sanitize('name'),
    validateRequired('name'),
    asyncHandler(async (req, res) => {
        const stage = pipeline.createStage(req.body);
        return created(res, stage);
    })
);

// PUT /api/pipeline/stages/:id - Update stage (manager+)
router.put('/stages/:id',
    requireManager,
    sanitize('name'),
    asyncHandler(async (req, res) => {
        const stage = pipeline.updateStage(req.params.id, req.body);

        if (!stage) {
            return notFound(res, 'Estágio');
        }

        return success(res, stage);
    })
);

// PUT /api/pipeline/reorder - Reorder stages (manager+)
router.put('/reorder',
    requireManager,
    validateRequired('stageIds'),
    asyncHandler(async (req, res) => {
        const { pipeline: pipelineName, stageIds } = req.body;
        const stages = pipeline.reorderStages(pipelineName || 'default', stageIds);
        return success(res, stages);
    })
);

// DELETE /api/pipeline/stages/:id - Delete stage (manager+)
router.delete('/stages/:id',
    requireManager,
    asyncHandler(async (req, res) => {
        const result = pipeline.deleteStage(req.params.id);

        if (!result.success) {
            return error(res, result.error, 'DELETE_FAILED', 400);
        }

        return success(res, { message: 'Estágio removido' });
    })
);

export default router;
