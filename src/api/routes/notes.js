/**
 * Notes Routes
 * Internal notes management
 */

import { Router } from 'express';
import notes from '../../crm/notes.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, sanitize } from '../middleware/validation.js';
import { success, created, notFound } from '../utils/response.js';

const router = Router();

// GET /api/notes/search - Search notes
router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return success(res, []);
    }

    const result = notes.search(q);
    return success(res, result);
}));

// GET /api/notes/:id - Get note by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const note = notes.getById(req.params.id);

    if (!note) {
        return notFound(res, 'Nota');
    }

    return success(res, note);
}));

// POST /api/notes - Create note
router.post('/',
    sanitize('content'),
    validateRequired('content'),
    asyncHandler(async (req, res) => {
        req.body.created_by = req.user?.id || 'system';
        const note = notes.create(req.body);
        return created(res, note);
    })
);

// PUT /api/notes/:id - Update note
router.put('/:id',
    sanitize('content'),
    asyncHandler(async (req, res) => {
        const note = notes.update(req.params.id, req.body);

        if (!note) {
            return notFound(res, 'Nota');
        }

        return success(res, note);
    })
);

// PUT /api/notes/:id/pin - Toggle pin
router.put('/:id/pin', asyncHandler(async (req, res) => {
    const note = notes.togglePin(req.params.id);

    if (!note) {
        return notFound(res, 'Nota');
    }

    return success(res, note);
}));

// DELETE /api/notes/:id - Delete note
router.delete('/:id', asyncHandler(async (req, res) => {
    const note = notes.getById(req.params.id);

    if (!note) {
        return notFound(res, 'Nota');
    }

    notes.delete(req.params.id);
    return success(res, { message: 'Nota removida' });
}));

export default router;
