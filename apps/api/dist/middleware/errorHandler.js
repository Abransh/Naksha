"use strict";
/**
 * Error Handling Middleware
 *
 * Provides comprehensive error handling for the application:
 * - Global error handler
 * - 404 handler for undefined routes
 * - Database error handling
 * - JWT error handling
 * - Validation error handling
 * - Custom error types
 * - Error logging and monitoring
 * - Security error sanitization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.specificErrorHandlers = exports.healthCheckErrors = exports.errorUtils = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.ExternalServiceError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const database_1 = require("../../../../packages/database");
const jsonwebtoken_1 = require("jsonwebtoken");
const zod_1 = require("zod");
/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Custom error classes for specific scenarios
 */
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class ExternalServiceError extends AppError {
    constructor(service, originalError) {
        super(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', originalError);
        this.name = 'ExternalServiceError';
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Check if error is a known operational error
 */
const isOperationalError = (error) => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};
/**
 * Handle Prisma database errors
 */
const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const field = error.meta?.target;
            const fieldName = field?.[0] || 'field';
            return new ConflictError(`A record with this ${fieldName} already exists`);
        case 'P2025':
            // Record not found
            return new NotFoundError('Record not found');
        case 'P2003':
            // Foreign key constraint violation
            return new ValidationError('Cannot delete record due to related data');
        case 'P2014':
            // Invalid ID
            return new ValidationError('Invalid ID provided');
        case 'P2021':
            // Table does not exist
            return new AppError('Database table does not exist', 500, 'DATABASE_ERROR');
        case 'P2022':
            // Column does not exist
            return new AppError('Database column does not exist', 500, 'DATABASE_ERROR');
        case 'P1001':
            // Can't reach database server
            return new AppError('Database connection failed', 503, 'DATABASE_CONNECTION_ERROR');
        case 'P1008':
            // Operations timed out
            return new AppError('Database operation timed out', 504, 'DATABASE_TIMEOUT');
        case 'P1017':
            // Server has closed the connection
            return new AppError('Database connection lost', 503, 'DATABASE_CONNECTION_LOST');
        default:
            console.error('Unhandled Prisma error:', error);
            return new AppError('Database operation failed', 500, 'DATABASE_ERROR', {
                prismaCode: error.code,
                prismaMessage: error.message
            });
    }
};
/**
 * Handle JWT authentication errors
 */
const handleJWTError = (error) => {
    if (error instanceof jsonwebtoken_1.TokenExpiredError) {
        return new AuthenticationError('Token has expired');
    }
    switch (error.message) {
        case 'invalid token':
            return new AuthenticationError('Invalid authentication token');
        case 'jwt malformed':
            return new AuthenticationError('Malformed authentication token');
        case 'jwt signature is required':
            return new AuthenticationError('Token signature is required');
        case 'invalid signature':
            return new AuthenticationError('Invalid token signature');
        default:
            return new AuthenticationError('Token validation failed');
    }
};
/**
 * Handle Zod validation errors
 */
const handleZodError = (error) => {
    const details = error.errors.map(err => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
        value: err.received
    }));
    return new ValidationError('Validation failed', details);
};
/**
 * Handle Multer file upload errors
 */
const handleMulterError = (error) => {
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            return new ValidationError('File size too large');
        case 'LIMIT_FILE_COUNT':
            return new ValidationError('Too many files uploaded');
        case 'LIMIT_UNEXPECTED_FILE':
            return new ValidationError('Unexpected file field');
        case 'MISSING_FIELD_NAME':
            return new ValidationError('Missing file field name');
        default:
            return new AppError('File upload error', 400, 'FILE_UPLOAD_ERROR');
    }
};
/**
 * Sanitize error for production (remove sensitive information)
 */
const sanitizeError = (error, isProduction) => {
    if (isProduction && !isOperationalError(error)) {
        return {
            error: 'Internal Server Error',
            message: 'Something went wrong. Please try again later.',
            code: 'INTERNAL_ERROR'
        };
    }
    return {
        error: error.name || 'Error',
        message: error.message || 'An error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details,
        stack: !isProduction ? error.stack : undefined
    };
};
/**
 * Log error for monitoring and debugging
 */
const logError = (error, req) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        user: req.user?.id || 'anonymous',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            statusCode: error.statusCode
        }
    };
    // In production, you would send this to a logging service like:
    // - Winston with external transports
    // - Sentry for error tracking
    // - DataDog for monitoring
    // - CloudWatch for AWS deployments
    if (process.env.NODE_ENV === 'development') {
        console.error('🚨 Error Details:', JSON.stringify(errorInfo, null, 2));
    }
    else {
        console.error('🚨 Error:', {
            message: error.message,
            code: error.code,
            path: req.path,
            user: errorInfo.user
        });
    }
    // TODO: Integrate with external monitoring services
    // Example integrations:
    // - await sentryLogger.captureException(error, errorInfo);
    // - await datadogLogger.error(error.message, errorInfo);
    // - await slackAlert.sendErrorNotification(errorInfo);
};
/**
 * Generate unique request ID for error tracking
 */
const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
/**
 * Main error handler middleware
 * This should be the last middleware in the application
 */
const errorHandler = (error, req, res, next) => {
    let appError;
    // Convert various error types to our AppError format
    if (error instanceof AppError) {
        appError = error;
    }
    else if (error instanceof database_1.Prisma.PrismaClientKnownRequestError) {
        appError = handlePrismaError(error);
    }
    else if (error instanceof database_1.Prisma.PrismaClientValidationError) {
        appError = new ValidationError('Invalid data provided to database');
    }
    else if (error instanceof database_1.Prisma.PrismaClientInitializationError) {
        appError = new AppError('Database initialization failed', 503, 'DATABASE_INIT_ERROR');
    }
    else if (error instanceof jsonwebtoken_1.JsonWebTokenError || error instanceof jsonwebtoken_1.TokenExpiredError) {
        appError = handleJWTError(error);
    }
    else if (error instanceof zod_1.ZodError) {
        appError = handleZodError(error);
    }
    else if (error.code && error.code.startsWith('LIMIT_')) {
        // Multer errors
        appError = handleMulterError(error);
    }
    else if (error.name === 'CastError') {
        // MongoDB ObjectId casting errors
        appError = new ValidationError('Invalid ID format');
    }
    else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        appError = new ValidationError('Invalid JSON in request body');
    }
    else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        appError = new ExternalServiceError('External service unavailable');
    }
    else {
        // Unknown error - create a generic AppError
        appError = new AppError(error.message || 'An unexpected error occurred', error.statusCode || 500, error.code || 'INTERNAL_ERROR');
    }
    // Log the error
    logError(appError, req);
    // Generate request ID for tracking
    const requestId = generateRequestId();
    // Prepare error response
    const isProduction = process.env.NODE_ENV === 'production';
    const sanitizedError = sanitizeError(appError, isProduction);
    const errorResponse = {
        ...sanitizedError,
        statusCode: appError.statusCode,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId
    };
    // Set security headers
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    });
    // Send error response
    res.status(appError.statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
    res.status(404).json({
        error: 'Not Found',
        message: `The requested endpoint ${req.method} ${req.path} was not found`,
        code: 'ROUTE_NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        suggestion: 'Please check the API documentation for available endpoints'
    });
};
exports.notFoundHandler = notFoundHandler;
/**
 * Async error handler wrapper
 * Wraps async route handlers to catch Promise rejections
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Error handling utilities
 */
exports.errorUtils = {
    /**
     * Create and throw a custom error
     */
    throw: (message, statusCode = 500, code = 'CUSTOM_ERROR', details) => {
        throw new AppError(message, statusCode, code, details);
    },
    /**
     * Assert a condition and throw error if false
     */
    assert: (condition, message, statusCode = 400, code = 'ASSERTION_ERROR') => {
        if (!condition) {
            throw new AppError(message, statusCode, code);
        }
    },
    /**
     * Wrap a function with error handling
     */
    wrap: (fn) => {
        return ((...args) => {
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    return result.catch((error) => {
                        throw new AppError(error.message, 500, 'WRAPPED_ERROR');
                    });
                }
                return result;
            }
            catch (error) {
                throw new AppError(error.message, 500, 'WRAPPED_ERROR');
            }
        });
    },
    /**
     * Check if error should be retried
     */
    isRetryable: (error) => {
        const retryableCodes = [
            'ECONNRESET',
            'ENOTFOUND',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'DATABASE_CONNECTION_ERROR',
            'DATABASE_TIMEOUT'
        ];
        return retryableCodes.includes(error.code) || error.statusCode >= 500;
    }
};
/**
 * Health check error detection
 */
exports.healthCheckErrors = {
    /**
     * Check if the application is healthy
     */
    checkHealth: async () => {
        const errors = [];
        try {
            // Add health checks here
            // - Database connectivity
            // - Redis connectivity
            // - External service availability
            // - Memory usage
            // - Disk space
            return { healthy: errors.length === 0, errors };
        }
        catch (error) {
            errors.push('Health check failed');
            return { healthy: false, errors };
        }
    }
};
/**
 * Error handling middleware for specific scenarios
 */
exports.specificErrorHandlers = {
    /**
     * Handle payment processing errors
     */
    paymentError: (error) => {
        if (error.code === 'PAYMENT_FAILED') {
            return new AppError('Payment processing failed', 402, 'PAYMENT_ERROR', error.details);
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return new AppError('Insufficient funds', 402, 'INSUFFICIENT_FUNDS');
        }
        return new AppError('Payment error occurred', 500, 'PAYMENT_SYSTEM_ERROR');
    },
    /**
     * Handle email service errors
     */
    emailError: (error) => {
        if (error.code === 'EMAIL_SEND_FAILED') {
            return new ExternalServiceError('Email service');
        }
        return new AppError('Email delivery failed', 502, 'EMAIL_ERROR');
    },
    /**
     * Handle file upload service errors
     */
    uploadError: (error) => {
        if (error.code === 'STORAGE_FULL') {
            return new AppError('Storage space full', 507, 'STORAGE_FULL');
        }
        if (error.code === 'INVALID_FILE_FORMAT') {
            return new ValidationError('Invalid file format');
        }
        return new AppError('File upload failed', 500, 'UPLOAD_ERROR');
    }
};
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.js.map