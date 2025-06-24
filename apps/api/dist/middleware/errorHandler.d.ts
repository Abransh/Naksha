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
import { Request, Response, NextFunction } from 'express';
/**
 * Custom error class for application-specific errors
 */
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
/**
 * Custom error classes for specific scenarios
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, originalError?: any);
}
/**
 * Main error handler middleware
 * This should be the last middleware in the application
 */
export declare const errorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
/**
 * 404 handler for undefined routes
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Async error handler wrapper
 * Wraps async route handlers to catch Promise rejections
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Error handling utilities
 */
export declare const errorUtils: {
    /**
     * Create and throw a custom error
     */
    throw: (message: string, statusCode?: number, code?: string, details?: any) => never;
    /**
     * Assert a condition and throw error if false
     */
    assert: (condition: any, message: string, statusCode?: number, code?: string) => void;
    /**
     * Wrap a function with error handling
     */
    wrap: <T extends (...args: any[]) => any>(fn: T) => T;
    /**
     * Check if error should be retried
     */
    isRetryable: (error: any) => boolean;
};
/**
 * Health check error detection
 */
export declare const healthCheckErrors: {
    /**
     * Check if the application is healthy
     */
    checkHealth: () => Promise<{
        healthy: boolean;
        errors: string[];
    }>;
};
/**
 * Error handling middleware for specific scenarios
 */
export declare const specificErrorHandlers: {
    /**
     * Handle payment processing errors
     */
    paymentError: (error: any) => AppError;
    /**
     * Handle email service errors
     */
    emailError: (error: any) => AppError;
    /**
     * Handle file upload service errors
     */
    uploadError: (error: any) => AppError;
};
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map