/**
 * Standard API Response Helpers
 */

/**
 * Success response
 */
export function success(res, data, status = 200) {
    return res.status(status).json({
        success: true,
        data
    });
}

/**
 * Created response
 */
export function created(res, data) {
    return success(res, data, 201);
}

/**
 * Paginated response
 */
export function paginated(res, data, pagination) {
    return res.status(200).json({
        success: true,
        data,
        pagination
    });
}

/**
 * Error response
 */
export function error(res, message, code = 'ERROR', status = 400) {
    return res.status(status).json({
        success: false,
        error: message,
        code
    });
}

/**
 * Not found response
 */
export function notFound(res, resource = 'Recurso') {
    return error(res, `${resource} não encontrado`, 'NOT_FOUND', 404);
}

/**
 * Forbidden response
 */
export function forbidden(res, message = 'Sem permissão') {
    return error(res, message, 'FORBIDDEN', 403);
}

/**
 * Validation error response
 */
export function validationError(res, message, fields = null) {
    return res.status(400).json({
        success: false,
        error: message,
        code: 'VALIDATION_ERROR',
        fields
    });
}
