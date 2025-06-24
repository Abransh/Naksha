"use strict";
// apps/api/src/utils/appError.ts
// Nakksha Consulting Platform - Application Error Classes
// Standardized error handling with proper HTTP status codes and error types
// Supports detailed error tracking and user-friendly messages
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncErrorHandler = exports.createErrorHandler = exports.normalizeError = exports.getHttpStatusCode = exports.isAppError = exports.isOperationalError = exports.ErrorFactory = exports.MaintenanceError = exports.QuotaExceededError = exports.SessionError = exports.FileUploadError = exports.PaymentError = exports.EmailServiceError = exports.ConfigurationError = exports.DatabaseError = exports.ExternalServiceError = exports.BusinessLogicError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const logger_1 = require("./logger");
/**
 * Base application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', isOperational = true, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.timestamp = new Date();
        this.details = details;
        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Convert error to JSON for API responses
     */
    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.errorCode,
            statusCode: this.statusCode,
            timestamp: this.timestamp.toISOString(),
            ...(this.details && { details: this.details })
        };
    }
    /**
     * Log this error
     */
    async log(context) {
        await logger_1.logger.error(this.message, {
            errorCode: this.errorCode,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            stack: this.stack,
            details: this.details,
            ...context
        });
    }
}
exports.AppError = AppError;
/**
 * Validation error (400)
 */
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', true, details);
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error (401)
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required', details) {
        super(message, 401, 'AUTHENTICATION_ERROR', true, details);
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error (403)
 */
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions', details) {
        super(message, 403, 'AUTHORIZATION_ERROR', true, details);
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource', details) {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', true, details);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Conflict error (409)
 */
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, 'CONFLICT_ERROR', true, details);
    }
}
exports.ConflictError = ConflictError;
/**
 * Rate limit error (429)
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter) {
        super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Business logic error (422)
 */
class BusinessLogicError extends AppError {
    constructor(message, details) {
        super(message, 422, 'BUSINESS_LOGIC_ERROR', true, details);
    }
}
exports.BusinessLogicError = BusinessLogicError;
/**
 * External service error (502)
 */
class ExternalServiceError extends AppError {
    constructor(service, message, details) {
        super(message || `External service ${service} is unavailable`, 502, 'EXTERNAL_SERVICE_ERROR', true, { service, ...details });
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Database error (500)
 */
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 500, 'DATABASE_ERROR', true, details);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Configuration error (500)
 */
class ConfigurationError extends AppError {
    constructor(message, details) {
        super(message, 500, 'CONFIGURATION_ERROR', false, details);
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Email service error (500)
 */
class EmailServiceError extends AppError {
    constructor(message = 'Email service unavailable', details) {
        super(message, 500, 'EMAIL_SERVICE_ERROR', true, details);
    }
}
exports.EmailServiceError = EmailServiceError;
/**
 * Payment error (402)
 */
class PaymentError extends AppError {
    constructor(message, details) {
        super(message, 402, 'PAYMENT_ERROR', true, details);
    }
}
exports.PaymentError = PaymentError;
/**
 * File upload error (400)
 */
class FileUploadError extends AppError {
    constructor(message, details) {
        super(message, 400, 'FILE_UPLOAD_ERROR', true, details);
    }
}
exports.FileUploadError = FileUploadError;
/**
 * Session error (400)
 */
class SessionError extends AppError {
    constructor(message, details) {
        super(message, 400, 'SESSION_ERROR', true, details);
    }
}
exports.SessionError = SessionError;
/**
 * Quota exceeded error (429)
 */
class QuotaExceededError extends AppError {
    constructor(resource, limit, details) {
        super(`${resource} quota exceeded. Limit: ${limit}`, 429, 'QUOTA_EXCEEDED_ERROR', true, { resource, limit, ...details });
    }
}
exports.QuotaExceededError = QuotaExceededError;
/**
 * Maintenance mode error (503)
 */
class MaintenanceError extends AppError {
    constructor(message = 'Service temporarily unavailable for maintenance', estimatedTime) {
        super(message, 503, 'MAINTENANCE_ERROR', true, { estimatedTime });
    }
}
exports.MaintenanceError = MaintenanceError;
/**
 * Error factory for creating specific errors
 */
class ErrorFactory {
    /**
     * Create validation error with field details
     */
    static validation(message, field, value) {
        return new ValidationError(message, { field, value });
    }
    /**
     * Create authentication error with specific reason
     */
    static authentication(reason) {
        const messages = {
            invalid_token: 'Invalid authentication token',
            expired_token: 'Authentication token has expired',
            missing_token: 'Authentication token is required',
            invalid_credentials: 'Invalid email or password'
        };
        return new AuthenticationError(messages[reason], { reason });
    }
    /**
     * Create authorization error with required permission
     */
    static authorization(requiredPermission) {
        const message = requiredPermission
            ? `Permission required: ${requiredPermission}`
            : 'Insufficient permissions';
        return new AuthorizationError(message, { requiredPermission });
    }
    /**
     * Create not found error for specific resource
     */
    static notFound(resourceType, identifier) {
        const message = identifier
            ? `${resourceType} with identifier '${identifier}' not found`
            : `${resourceType} not found`;
        return new NotFoundError(message, { resourceType, identifier });
    }
    /**
     * Create conflict error for duplicate resource
     */
    static conflict(resource, field, value) {
        return new ConflictError(`${resource} with ${field} '${value}' already exists`, { resource, field, value });
    }
    /**
     * Create business logic error with operation context
     */
    static businessLogic(operation, reason, context) {
        return new BusinessLogicError(`Cannot ${operation}: ${reason}`, { operation, reason, ...context });
    }
    /**
     * Create rate limit error with specific limits
     */
    static rateLimit(maxRequests, windowMinutes, retryAfter) {
        return new RateLimitError(`Rate limit exceeded: ${maxRequests} requests per ${windowMinutes} minutes`, retryAfter);
    }
    /**
     * Create payment error with specific reason
     */
    static payment(reason, details) {
        const messages = {
            insufficient_funds: 'Insufficient funds for this transaction',
            payment_failed: 'Payment processing failed',
            invalid_method: 'Invalid payment method',
            processing_error: 'Payment processing error occurred'
        };
        return new PaymentError(messages[reason], { reason, ...details });
    }
}
exports.ErrorFactory = ErrorFactory;
/**
 * Type guard to check if error is operational
 */
const isOperationalError = (error) => {
    return error instanceof AppError && error.isOperational;
};
exports.isOperationalError = isOperationalError;
/**
 * Type guard to check if error is an AppError
 */
const isAppError = (error) => {
    return error instanceof AppError;
};
exports.isAppError = isAppError;
/**
 * Get appropriate HTTP status code from error
 */
const getHttpStatusCode = (error) => {
    if ((0, exports.isAppError)(error)) {
        return error.statusCode;
    }
    // Default status codes for common errors
    if (error.name === 'ValidationError')
        return 400;
    if (error.name === 'CastError')
        return 400;
    if (error.name === 'UnauthorizedError')
        return 401;
    if (error.name === 'JsonWebTokenError')
        return 401;
    if (error.name === 'TokenExpiredError')
        return 401;
    if (error.name === 'MongoError' && error.code === 11000)
        return 409;
    return 500;
};
exports.getHttpStatusCode = getHttpStatusCode;
/**
 * Convert any error to AppError
 */
const normalizeError = (error) => {
    if ((0, exports.isAppError)(error)) {
        return error;
    }
    // Handle specific error types
    if (error.name === 'ValidationError') {
        return new ValidationError(error.message, error);
    }
    if (error.name === 'JsonWebTokenError') {
        return new AuthenticationError('Invalid authentication token');
    }
    if (error.name === 'TokenExpiredError') {
        return new AuthenticationError('Authentication token has expired');
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return new ExternalServiceError('External service', 'Connection failed');
    }
    // Prisma specific errors
    if (error.code === 'P2002') {
        return new ConflictError('Unique constraint violation', error);
    }
    if (error.code === 'P2025') {
        return new NotFoundError('Record not found', error);
    }
    // Default to generic AppError
    return new AppError(error.message || 'An unexpected error occurred', 500, 'INTERNAL_ERROR', false, { originalError: error.name });
};
exports.normalizeError = normalizeError;
/**
 * Error handler middleware factory
 */
const createErrorHandler = (isDevelopment = false) => {
    return async (error, req, res, next) => {
        // Normalize error
        const appError = (0, exports.normalizeError)(error);
        // Log error
        await appError.log({
            requestId: req.requestId,
            userId: req.user?.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        // Prepare response
        const response = {
            error: appError.name,
            message: appError.message,
            code: appError.errorCode,
            timestamp: appError.timestamp.toISOString()
        };
        // Add additional details in development
        if (isDevelopment) {
            response.stack = appError.stack;
            response.details = appError.details;
        }
        // Add request ID for debugging
        if (req.requestId) {
            response.requestId = req.requestId;
        }
        // Send response
        res.status(appError.statusCode).json(response);
    };
};
exports.createErrorHandler = createErrorHandler;
/**
 * Express middleware for handling async errors
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncErrorHandler = asyncErrorHandler;
// Export main error class and factory
exports.default = AppError;
//# sourceMappingURL=appError.js.map