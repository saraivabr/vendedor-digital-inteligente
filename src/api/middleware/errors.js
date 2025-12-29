/**
 * Error Handling Middleware
 */

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        code: 'NOT_FOUND',
        path: req.path
    });
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
    console.error('API Error:', err);

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: err.message,
            code: 'VALIDATION_ERROR',
            details: err.details
        });
    }

    // SQLite errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            error: 'Registro duplicado ou violação de constraint',
            code: 'CONSTRAINT_ERROR'
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : err.message,
        code: 'SERVER_ERROR'
    });
}

/**
 * Async handler wrapper (catches promise rejections)
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
