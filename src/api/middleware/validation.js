/**
 * Request Validation Middleware
 */

/**
 * Validate required fields
 */
export function validateRequired(...fields) {
    return (req, res, next) => {
        const missing = [];

        for (const field of fields) {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            return res.status(400).json({
                error: `Campos obrigatórios: ${missing.join(', ')}`,
                code: 'MISSING_FIELDS',
                fields: missing
            });
        }

        next();
    };
}

/**
 * Validate email format
 */
export function validateEmail(field = 'email') {
    return (req, res, next) => {
        const email = req.body[field];

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: 'Email inválido',
                    code: 'INVALID_EMAIL'
                });
            }
        }

        next();
    };
}

/**
 * Validate phone format (Brazilian)
 */
export function validatePhone(field = 'phone') {
    return (req, res, next) => {
        const phone = req.body[field];

        if (phone) {
            // Remove non-digits
            const digits = phone.replace(/\D/g, '');

            // Brazilian phone: 10-11 digits (with DDD) or 12-13 (with country code)
            if (digits.length < 10 || digits.length > 13) {
                return res.status(400).json({
                    error: 'Telefone inválido',
                    code: 'INVALID_PHONE'
                });
            }

            // Normalize phone
            req.body[field] = digits.startsWith('55') ? digits : `55${digits}`;
        }

        next();
    };
}

/**
 * Validate enum value
 */
export function validateEnum(field, allowedValues) {
    return (req, res, next) => {
        const value = req.body[field];

        if (value !== undefined && !allowedValues.includes(value)) {
            return res.status(400).json({
                error: `${field} deve ser: ${allowedValues.join(', ')}`,
                code: 'INVALID_ENUM',
                field,
                allowed: allowedValues
            });
        }

        next();
    };
}

/**
 * Validate pagination params
 */
export function validatePagination(req, res, next) {
    const pageParam = parseInt(req.query.page);
    const limitParam = parseInt(req.query.limit);

    const page = isNaN(pageParam) ? 1 : pageParam;
    const limit = Math.min(isNaN(limitParam) ? 50 : limitParam, 100);

    if (page < 1) {
        return res.status(400).json({
            error: 'Página deve ser >= 1',
            code: 'INVALID_PAGE'
        });
    }

    req.pagination = { page, limit };
    next();
}

/**
 * Sanitize string fields
 */
export function sanitize(...fields) {
    return (req, res, next) => {
        for (const field of fields) {
            if (typeof req.body[field] === 'string') {
                req.body[field] = req.body[field].trim();
            }
        }
        next();
    };
}
