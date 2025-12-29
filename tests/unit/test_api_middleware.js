/**
 * Unit Tests for API Middleware
 * Tests authentication, validation, and error handling middleware
 */

import assert from 'assert';
import { describe, it, beforeEach } from 'node:test';

// Mock request and response objects
function createMockReq(overrides = {}) {
    return {
        headers: {},
        body: {},
        query: {},
        path: '/test',
        method: 'GET',
        user: null,
        ...overrides
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        _json: null,
        _status: null,
        status(code) {
            res._status = code;
            res.statusCode = code;
            return res;
        },
        json(data) {
            res._json = data;
            return res;
        }
    };
    return res;
}

function createMockNext() {
    const next = () => {
        next.called = true;
    };
    next.called = false;
    return next;
}

// Import middleware functions
import {
    validateRequired,
    validateEmail,
    validatePhone,
    validateEnum,
    validatePagination,
    sanitize
} from '../../src/api/middleware/validation.js';

import {
    notFoundHandler,
    errorHandler,
    asyncHandler
} from '../../src/api/middleware/errors.js';

import {
    success,
    created,
    paginated,
    error,
    notFound,
    forbidden,
    validationError
} from '../../src/api/utils/response.js';

describe('Validation Middleware', () => {
    describe('validateRequired', () => {
        it('should pass when all required fields present', () => {
            const req = createMockReq({ body: { name: 'Test', email: 'test@example.com' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateRequired('name', 'email');
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(res._json, null);
        });

        it('should fail when required fields missing', () => {
            const req = createMockReq({ body: { name: 'Test' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateRequired('name', 'email');
            middleware(req, res, next);

            assert.strictEqual(next.called, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.code, 'MISSING_FIELDS');
            assert.deepStrictEqual(res._json.fields, ['email']);
        });

        it('should fail when field is empty string', () => {
            const req = createMockReq({ body: { name: '' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateRequired('name');
            middleware(req, res, next);

            assert.strictEqual(next.called, false);
            assert.strictEqual(res.statusCode, 400);
        });
    });

    describe('validateEmail', () => {
        it('should pass for valid email', () => {
            const req = createMockReq({ body: { email: 'test@example.com' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateEmail();
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
        });

        it('should fail for invalid email', () => {
            const req = createMockReq({ body: { email: 'invalid-email' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateEmail();
            middleware(req, res, next);

            assert.strictEqual(next.called, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.code, 'INVALID_EMAIL');
        });

        it('should pass when email field is undefined', () => {
            const req = createMockReq({ body: {} });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateEmail();
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
        });
    });

    describe('validatePhone', () => {
        it('should normalize valid Brazilian phone (10 digits)', () => {
            const req = createMockReq({ body: { phone: '(11) 98765-4321' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validatePhone();
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.body.phone, '5511987654321');
        });

        it('should normalize valid Brazilian phone (11 digits)', () => {
            const req = createMockReq({ body: { phone: '11987654321' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validatePhone();
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.body.phone, '5511987654321');
        });

        it('should accept phone with country code', () => {
            const req = createMockReq({ body: { phone: '5511987654321' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validatePhone();
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.body.phone, '5511987654321');
        });

        it('should fail for too short phone', () => {
            const req = createMockReq({ body: { phone: '123456' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validatePhone();
            middleware(req, res, next);

            assert.strictEqual(next.called, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.code, 'INVALID_PHONE');
        });
    });

    describe('validateEnum', () => {
        it('should pass for valid enum value', () => {
            const req = createMockReq({ body: { status: 'active' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateEnum('status', ['active', 'inactive', 'pending']);
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
        });

        it('should fail for invalid enum value', () => {
            const req = createMockReq({ body: { status: 'unknown' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateEnum('status', ['active', 'inactive', 'pending']);
            middleware(req, res, next);

            assert.strictEqual(next.called, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.code, 'INVALID_ENUM');
        });

        it('should pass when field is undefined', () => {
            const req = createMockReq({ body: {} });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = validateEnum('status', ['active', 'inactive']);
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
        });
    });

    describe('validatePagination', () => {
        it('should set default pagination', () => {
            const req = createMockReq({ query: {} });
            const res = createMockRes();
            const next = createMockNext();

            validatePagination(req, res, next);

            assert.strictEqual(next.called, true);
            assert.deepStrictEqual(req.pagination, { page: 1, limit: 50 });
        });

        it('should parse pagination params', () => {
            const req = createMockReq({ query: { page: '3', limit: '20' } });
            const res = createMockRes();
            const next = createMockNext();

            validatePagination(req, res, next);

            assert.strictEqual(next.called, true);
            assert.deepStrictEqual(req.pagination, { page: 3, limit: 20 });
        });

        it('should cap limit at 100', () => {
            const req = createMockReq({ query: { limit: '500' } });
            const res = createMockRes();
            const next = createMockNext();

            validatePagination(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.pagination.limit, 100);
        });

        it('should fail for invalid page', () => {
            const req = createMockReq({ query: { page: '0' } });
            const res = createMockRes();
            const next = createMockNext();

            validatePagination(req, res, next);

            assert.strictEqual(next.called, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.code, 'INVALID_PAGE');
        });
    });

    describe('sanitize', () => {
        it('should trim string fields', () => {
            const req = createMockReq({ body: { name: '  Test  ', email: ' test@example.com ' } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = sanitize('name', 'email');
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.body.name, 'Test');
            assert.strictEqual(req.body.email, 'test@example.com');
        });

        it('should skip non-string fields', () => {
            const req = createMockReq({ body: { count: 42, active: true } });
            const res = createMockRes();
            const next = createMockNext();

            const middleware = sanitize('count', 'active');
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.body.count, 42);
            assert.strictEqual(req.body.active, true);
        });
    });
});

describe('Error Handling Middleware', () => {
    describe('notFoundHandler', () => {
        it('should return 404 error', () => {
            const req = createMockReq({ path: '/api/nonexistent' });
            const res = createMockRes();
            const next = createMockNext();

            notFoundHandler(req, res, next);

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res._json.code, 'NOT_FOUND');
            assert.strictEqual(res._json.path, '/api/nonexistent');
        });
    });

    describe('errorHandler', () => {
        it('should handle validation errors', () => {
            const err = new Error('Validation failed');
            err.name = 'ValidationError';
            err.details = { field: 'email' };

            const req = createMockReq();
            const res = createMockRes();
            const next = createMockNext();

            errorHandler(err, req, res, next);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.code, 'VALIDATION_ERROR');
        });

        it('should handle SQLite constraint errors', () => {
            const err = new Error('UNIQUE constraint failed');
            err.code = 'SQLITE_CONSTRAINT';

            const req = createMockReq();
            const res = createMockRes();
            const next = createMockNext();

            errorHandler(err, req, res, next);

            assert.strictEqual(res.statusCode, 409);
            assert.strictEqual(res._json.code, 'CONSTRAINT_ERROR');
        });

        it('should handle generic errors', () => {
            const err = new Error('Something went wrong');

            const req = createMockReq();
            const res = createMockRes();
            const next = createMockNext();

            // Mock production mode
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            errorHandler(err, req, res, next);

            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res._json.code, 'SERVER_ERROR');
            assert.strictEqual(res._json.error, 'Erro interno do servidor');

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('asyncHandler', () => {
        it('should handle successful async functions', async () => {
            const req = createMockReq();
            const res = createMockRes();
            const next = createMockNext();

            const asyncFn = async (req, res) => {
                res.json({ success: true });
            };

            const handler = asyncHandler(asyncFn);
            await handler(req, res, next);

            assert.strictEqual(res._json.success, true);
            assert.strictEqual(next.called, false);
        });

        it('should catch async errors', async () => {
            const req = createMockReq();
            const res = createMockRes();
            const next = createMockNext();

            const asyncFn = async () => {
                throw new Error('Async error');
            };

            const handler = asyncHandler(asyncFn);
            await handler(req, res, next);

            assert.strictEqual(next.called, true);
        });
    });
});

describe('Response Helpers', () => {
    describe('success', () => {
        it('should return success response', () => {
            const res = createMockRes();
            const data = { id: 1, name: 'Test' };

            success(res, data);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res._json.success, true);
            assert.deepStrictEqual(res._json.data, data);
        });
    });

    describe('created', () => {
        it('should return 201 created response', () => {
            const res = createMockRes();
            const data = { id: 1 };

            created(res, data);

            assert.strictEqual(res.statusCode, 201);
            assert.strictEqual(res._json.success, true);
        });
    });

    describe('paginated', () => {
        it('should return paginated response', () => {
            const res = createMockRes();
            const data = [{ id: 1 }, { id: 2 }];
            const pagination = { page: 1, limit: 10, total: 2 };

            paginated(res, data, pagination);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res._json.success, true);
            assert.deepStrictEqual(res._json.data, data);
            assert.deepStrictEqual(res._json.pagination, pagination);
        });
    });

    describe('error', () => {
        it('should return error response', () => {
            const res = createMockRes();

            error(res, 'Test error', 'TEST_ERROR', 400);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.success, false);
            assert.strictEqual(res._json.error, 'Test error');
            assert.strictEqual(res._json.code, 'TEST_ERROR');
        });
    });

    describe('notFound', () => {
        it('should return 404 not found', () => {
            const res = createMockRes();

            notFound(res, 'Contact');

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res._json.success, false);
            assert.strictEqual(res._json.code, 'NOT_FOUND');
        });
    });

    describe('forbidden', () => {
        it('should return 403 forbidden', () => {
            const res = createMockRes();

            forbidden(res, 'Access denied');

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res._json.success, false);
            assert.strictEqual(res._json.code, 'FORBIDDEN');
        });
    });

    describe('validationError', () => {
        it('should return validation error with fields', () => {
            const res = createMockRes();

            validationError(res, 'Invalid data', ['email', 'phone']);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res._json.success, false);
            assert.strictEqual(res._json.code, 'VALIDATION_ERROR');
            assert.deepStrictEqual(res._json.fields, ['email', 'phone']);
        });
    });
});

console.log('✅ All middleware tests completed');
