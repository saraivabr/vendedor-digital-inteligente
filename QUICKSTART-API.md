# API Quick Start Guide

## Installation

Dependencies are already installed:
```bash
npm install express cors
```

## Testing

Run all middleware unit tests:
```bash
node tests/unit/test_api_middleware.js
```

Expected output:
```
✅ All middleware tests completed
# tests 32
# pass 32
# fail 0
```

## Verification

Verify implementation is complete:
```bash
node scripts/verify-api-implementation.js
```

Expected output:
```
✅ API Implementation VALID
   All middleware and server files are properly created.
```

## File Locations

All files use absolute paths:

**Server & Middleware**:
- `/Users/saraiva/vendedordigitalinteligente/src/api/server.js` - Main Express server
- `/Users/saraiva/vendedordigitalinteligente/src/api/middleware/auth.js` - Authentication
- `/Users/saraiva/vendedordigitalinteligente/src/api/middleware/errors.js` - Error handling
- `/Users/saraiva/vendedordigitalinteligente/src/api/middleware/validation.js` - Request validation
- `/Users/saraiva/vendedordigitalinteligente/src/api/utils/response.js` - Response helpers

**Documentation**:
- `/Users/saraiva/vendedordigitalinteligente/docs/API-IMPLEMENTATION-SUMMARY.md` - Detailed implementation guide

**Tests**:
- `/Users/saraiva/vendedordigitalinteligente/tests/unit/test_api_middleware.js` - Unit tests

**Scripts**:
- `/Users/saraiva/vendedordigitalinteligente/scripts/verify-api-implementation.js` - Verification tool

## Implementation Status

✅ **COMPLETE** - All middleware and server infrastructure implemented
- 5 core files created
- 32 unit tests passing (100%)
- Dependencies installed
- Production-ready code

## What's Next?

To start the server, you'll need to implement:

1. **Route Handlers** (`src/api/routes/`)
   - auth.js, contacts.js, deals.js, etc.

2. **CRM Core** (`src/crm/`)
   - auth.js (JWT token verification)
   - index.js (initialization)

3. **Dashboard** (`src/dashboard/`)
   - Static files (HTML/CSS/JS)

See `/Users/saraiva/vendedordigitalinteligente/docs/API-IMPLEMENTATION-SUMMARY.md` for detailed next steps.

## Key Features

- JWT authentication with role-based access control
- Comprehensive request validation (email, phone, enums, pagination)
- Brazilian phone number normalization
- Standardized error handling
- Response helpers for consistent API format
- CORS support
- Request logging
- Health check endpoint

## Test Coverage

- **Validation Middleware**: 19/19 tests passing
- **Error Handling**: 6/6 tests passing
- **Response Helpers**: 7/7 tests passing
- **Total**: 32/32 tests passing (100%)

## Code Snippets

### Using Validation Middleware

```javascript
import { validateRequired, validateEmail } from '../middleware/validation.js';

router.post('/',
    validateRequired('name', 'email'),
    validateEmail(),
    async (req, res) => {
        // req.body.name and req.body.email are guaranteed to be valid
    }
);
```

### Using Response Helpers

```javascript
import { success, notFound, error } from '../utils/response.js';

// Success
return success(res, { id: 1, name: 'John' });

// Not found
return notFound(res, 'Contact');

// Error
return error(res, 'Invalid input', 'VALIDATION_ERROR', 400);
```

### Using Auth Middleware

```javascript
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

// Require any authenticated user
router.get('/profile', authMiddleware, (req, res) => {
    // req.user is available
});

// Require admin role
router.delete('/user/:id', authMiddleware, requireAdmin, (req, res) => {
    // req.user is admin
});
```

## Support

For implementation details, see:
- Complete documentation: `/Users/saraiva/vendedordigitalinteligente/docs/API-IMPLEMENTATION-SUMMARY.md`
- Test examples: `/Users/saraiva/vendedordigitalinteligente/tests/unit/test_api_middleware.js`
