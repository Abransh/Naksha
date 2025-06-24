/**
 * Base application error class
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly isOperational: boolean;
    readonly timestamp: Date;
    readonly details?: any;
    constructor(message: string, statusCode?: number, errorCode?: string, isOperational?: boolean, details?: any);
    /**
     * Convert error to JSON for API responses
     */
    toJSON(): any;
    /**
     * Log this error
     */
    log(context?: any): Promise<void>;
}
/**
 * Validation error (400)
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Authentication error (401)
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string, details?: any);
}
/**
 * Authorization error (403)
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string, details?: any);
}
/**
 * Not found error (404)
 */
export declare class NotFoundError extends AppError {
    constructor(resource?: string, details?: any);
}
/**
 * Conflict error (409)
 */
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Rate limit error (429)
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, retryAfter?: number);
}
/**
 * Business logic error (422)
 */
export declare class BusinessLogicError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * External service error (502)
 */
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message?: string, details?: any);
}
/**
 * Database error (500)
 */
export declare class DatabaseError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Configuration error (500)
 */
export declare class ConfigurationError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Email service error (500)
 */
export declare class EmailServiceError extends AppError {
    constructor(message?: string, details?: any);
}
/**
 * Payment error (402)
 */
export declare class PaymentError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * File upload error (400)
 */
export declare class FileUploadError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Session error (400)
 */
export declare class SessionError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Quota exceeded error (429)
 */
export declare class QuotaExceededError extends AppError {
    constructor(resource: string, limit: number, details?: any);
}
/**
 * Maintenance mode error (503)
 */
export declare class MaintenanceError extends AppError {
    constructor(message?: string, estimatedTime?: string);
}
/**
 * Error factory for creating specific errors
 */
export declare class ErrorFactory {
    /**
     * Create validation error with field details
     */
    static validation(message: string, field?: string, value?: any): ValidationError;
    /**
     * Create authentication error with specific reason
     */
    static authentication(reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials'): AuthenticationError;
    /**
     * Create authorization error with required permission
     */
    static authorization(requiredPermission?: string): AuthorizationError;
    /**
     * Create not found error for specific resource
     */
    static notFound(resourceType: string, identifier?: string): NotFoundError;
    /**
     * Create conflict error for duplicate resource
     */
    static conflict(resource: string, field: string, value: any): ConflictError;
    /**
     * Create business logic error with operation context
     */
    static businessLogic(operation: string, reason: string, context?: any): BusinessLogicError;
    /**
     * Create rate limit error with specific limits
     */
    static rateLimit(maxRequests: number, windowMinutes: number, retryAfter?: number): RateLimitError;
    /**
     * Create payment error with specific reason
     */
    static payment(reason: 'insufficient_funds' | 'payment_failed' | 'invalid_method' | 'processing_error', details?: any): PaymentError;
}
/**
 * Type guard to check if error is operational
 */
export declare const isOperationalError: (error: Error) => boolean;
/**
 * Type guard to check if error is an AppError
 */
export declare const isAppError: (error: Error) => error is AppError;
/**
 * Get appropriate HTTP status code from error
 */
export declare const getHttpStatusCode: (error: Error) => number;
/**
 * Convert any error to AppError
 */
export declare const normalizeError: (error: Error | any) => AppError;
/**
 * Error handler middleware factory
 */
export declare const createErrorHandler: (isDevelopment?: boolean) => (error: Error, req: any, res: any, next: any) => Promise<void>;
/**
 * Express middleware for handling async errors
 */
export declare const asyncErrorHandler: (fn: any) => (req: any, res: any, next: any) => void;
export default AppError;
//# sourceMappingURL=appError.d.ts.map