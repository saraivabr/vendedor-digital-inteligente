/**
 * Contacts Routes
 * Full CRUD for contact management
 */

import { Router } from 'express';
import contacts from '../../crm/contacts.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateRequired, validatePhone, validateEmail, validatePagination, sanitize } from '../middleware/validation.js';
import { success, created, paginated, notFound, error } from '../utils/response.js';

const router = Router();

// GET /api/contacts - List contacts
router.get('/',
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const { search, source, tags, sortBy, sortOrder } = req.query;

        const result = contacts.list({
            page,
            limit,
            search,
            source,
            tags: tags ? tags.split(',') : null,
            sortBy: sortBy || 'created_at',
            sortOrder: sortOrder || 'DESC'
        });

        return paginated(res, result.data, result.pagination);
    })
);

// GET /api/contacts/stats - Get statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = contacts.getStats();
    return success(res, stats);
}));

// GET /api/contacts/:id - Get contact by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const contact = contacts.getById(req.params.id);

    if (!contact) {
        return notFound(res, 'Contato');
    }

    return success(res, contact);
}));

// GET /api/contacts/:id/timeline - Get contact timeline
router.get('/:id/timeline', asyncHandler(async (req, res) => {
    const contact = contacts.getById(req.params.id);

    if (!contact) {
        return notFound(res, 'Contato');
    }

    const limit = parseInt(req.query.limit) || 50;
    const timeline = contacts.getTimeline(req.params.id, limit);

    return success(res, timeline);
}));

// GET /api/contacts/:id/deals - Get contact deals
router.get('/:id/deals', asyncHandler(async (req, res) => {
    const contact = contacts.getById(req.params.id);

    if (!contact) {
        return notFound(res, 'Contato');
    }

    const deals = contacts.getDeals(req.params.id);

    return success(res, deals);
}));

// POST /api/contacts - Create contact
router.post('/',
    sanitize('name', 'email', 'company_name'),
    validateRequired('phone'),
    validatePhone('phone'),
    asyncHandler(async (req, res) => {
        // Check if phone already exists
        const existing = contacts.getByPhone(req.body.phone);
        if (existing) {
            return error(res, 'Telefone já cadastrado', 'DUPLICATE_PHONE', 409);
        }

        const contact = contacts.create(req.body);
        return created(res, contact);
    })
);

// PUT /api/contacts/:id - Update contact
router.put('/:id',
    sanitize('name', 'email', 'company_name'),
    asyncHandler(async (req, res) => {
        const contact = contacts.update(req.params.id, req.body);

        if (!contact) {
            return notFound(res, 'Contato');
        }

        return success(res, contact);
    })
);

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', asyncHandler(async (req, res) => {
    const contact = contacts.getById(req.params.id);

    if (!contact) {
        return notFound(res, 'Contato');
    }

    contacts.delete(req.params.id);
    return success(res, { message: 'Contato removido' });
}));

// POST /api/contacts/:id/tags - Add tags
router.post('/:id/tags',
    validateRequired('tags'),
    asyncHandler(async (req, res) => {
        const { tags: newTags } = req.body;

        if (!Array.isArray(newTags)) {
            return error(res, 'Tags deve ser um array', 'INVALID_TAGS', 400);
        }

        const contact = contacts.addTags(req.params.id, newTags);

        if (!contact) {
            return notFound(res, 'Contato');
        }

        return success(res, contact);
    })
);

// DELETE /api/contacts/:id/tags/:tag - Remove tag
router.delete('/:id/tags/:tag', asyncHandler(async (req, res) => {
    const contact = contacts.removeTags(req.params.id, [req.params.tag]);

    if (!contact) {
        return notFound(res, 'Contato');
    }

    return success(res, contact);
}));

// GET /api/contacts/phone/:phone - Get by phone
router.get('/phone/:phone', asyncHandler(async (req, res) => {
    const contact = contacts.getByPhone(req.params.phone);

    if (!contact) {
        return notFound(res, 'Contato');
    }

    return success(res, contact);
}));

export default router;
