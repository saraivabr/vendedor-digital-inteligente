/**
 * Tags Routes
 * Tag management
 */

import { Router } from 'express';
import tags from '../../crm/tags.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, sanitize } from '../middleware/validation.js';
import { success, created, notFound, error } from '../utils/response.js';

const router = Router();

// GET /api/tags - List all tags
router.get('/', asyncHandler(async (req, res) => {
    const { category } = req.query;
    const tagsList = tags.list(category);
    return success(res, tagsList);
}));

// GET /api/tags/stats - Tag usage statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = tags.getUsageStats();
    return success(res, stats);
}));

// GET /api/tags/suggest - Suggest tags
router.get('/suggest', asyncHandler(async (req, res) => {
    const { content } = req.query;
    const suggestions = tags.suggestTags(content || '');
    return success(res, suggestions);
}));

// GET /api/tags/:id - Get tag by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const tag = tags.getById(req.params.id);

    if (!tag) {
        return notFound(res, 'Tag');
    }

    return success(res, tag);
}));

// POST /api/tags - Create tag
router.post('/',
    sanitize('name'),
    validateRequired('name'),
    asyncHandler(async (req, res) => {
        // Check if name exists
        if (tags.getByName(req.body.name)) {
            return error(res, 'Tag já existe', 'DUPLICATE_TAG', 409);
        }

        const tag = tags.create(req.body);
        return created(res, tag);
    })
);

// PUT /api/tags/:id - Update tag
router.put('/:id',
    sanitize('name'),
    asyncHandler(async (req, res) => {
        const tag = tags.update(req.params.id, req.body);

        if (!tag) {
            return notFound(res, 'Tag');
        }

        return success(res, tag);
    })
);

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', asyncHandler(async (req, res) => {
    const tag = tags.getById(req.params.id);

    if (!tag) {
        return notFound(res, 'Tag');
    }

    tags.delete(req.params.id);
    return success(res, { message: 'Tag removida' });
}));

export default router;
