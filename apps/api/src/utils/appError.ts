// apps/api/src/utils/appError.ts
// Nakksha Consulting Platform - Application Error Classes
// Standardized error handling with proper HTTP status codes and error types
// Supports detailed error tracking and user-friendly messages

import { logger } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    isOperational = true,
    details?: any
  ) {
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
  async log(context?: any): Promise<void> {
    await logger.error(this.message, {
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      stack: this.stack,
      details: this.details,
      ...context
    });
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details?: any) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, details);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', details?: any) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, details);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', true, details);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', true, details);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
  }
}

/**
 * Business logic error (422)
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', true, details);
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: any) {
    super(
      message || `External service ${service} is unavailable`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
      { service, ...details }
    );
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

/**
 * Configuration error (500)
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CONFIGURATION_ERROR', false, details);
  }
}

/**
 * Email service error (500)
 */
export class EmailServiceError extends AppError {
  constructor(message = 'Email service unavailable', details?: any) {
    super(message, 500, 'EMAIL_SERVICE_ERROR', true, details);
  }
}

/**
 * Payment error (402)
 */
export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, 'PAYMENT_ERROR', true, details);
  }
}

/**
 * File upload error (400)
 */
export class FileUploadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'FILE_UPLOAD_ERROR', true, details);
  }
}

/**
 * Session error (400)
 */
export class SessionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'SESSION_ERROR', true, details);
  }
}

/**
 * Quota exceeded error (429)
 */
export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number, details?: any) {
    super(
      `${resource} quota exceeded. Limit: ${limit}`,
      429,
      'QUOTA_EXCEEDED_ERROR',
      true,
      { resource, limit, ...details }
    );
  }
}

/**
 * Maintenance mode error (503)
 */
export class MaintenanceError extends AppError {
  constructor(message = 'Service temporarily unavailable for maintenance', estimatedTime?: string) {
    super(
      message,
      503,
      'MAINTENANCE_ERROR',
      true,
      { estimatedTime }
    );
  }
}

/**
 * Error factory for creating specific errors
 */
export class ErrorFactory {
  /**
   * Create validation error with field details
   */
  static validation(message: string, field?: string, value?: any): ValidationError {
    return new ValidationError(message, { field, value });
  }

  /**
   * Create authentication error with specific reason
   */
  static authentication(reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials'): AuthenticationError {
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
  static authorization(requiredPermission?: string): AuthorizationError {
    const message = requiredPermission 
      ? `Permission required: ${requiredPermission}`
      : 'Insufficient permissions';
    
    return new AuthorizationError(message, { requiredPermission });
  }

  /**
   * Create not found error for specific resource
   */
  static notFound(resourceType: string, identifier?: string): NotFoundError {
    const message = identifier 
      ? `${resourceType} with identifier '${identifier}' not found`
      : `${resourceType} not found`;
    
    return new NotFoundError(message, { resourceType, identifier });
  }

  /**
   * Create conflict error for duplicate resource
   */
  static conflict(resource: string, field: string, value: any): ConflictError {
    return new ConflictError(
      `${resource} with ${field} '${value}' already exists`,
      { resource, field, value }
    );
  }

  /**
   * Create business logic error with operation context
   */
  static businessLogic(operation: string, reason: string, context?: any): BusinessLogicError {
    return new BusinessLogicError(
      `Cannot ${operation}: ${reason}`,
      { operation, reason, ...context }
    );
  }

  /**
   * Create rate limit error with specific limits
   */
  static rateLimit(maxRequests: number, windowMinutes: number, retryAfter?: number): RateLimitError {
    return new RateLimitError(
      `Rate limit exceeded: ${maxRequests} requests per ${windowMinutes} minutes`,
      retryAfter
    );
  }

  /**
   * Create payment error with specific reason
   */
  static payment(reason: 'insufficient_funds' | 'payment_failed' | 'invalid_method' | 'processing_error', details?: any): PaymentError {
    const messages = {
      insufficient_funds: 'Insufficient funds for this transaction',
      payment_failed: 'Payment processing failed',
      invalid_method: 'Invalid payment method',
      processing_error: 'Payment processing error occurred'
    };
    
    return new PaymentError(messages[reason], { reason, ...details });
  }
}

/**
 * Type guard to check if error is operational
 */
export const isOperationalError = (error: Error): boolean => {
  return error instanceof AppError && error.isOperational;
};

/**
 * Type guard to check if error is an AppError
 */
export const isAppError = (error: Error): error is AppError => {
  return error instanceof AppError;
};

/**
 * Get appropriate HTTP status code from error
 */
export const getHttpStatusCode = (error: Error): number => {
  if (isAppError(error)) {
    return error.statusCode;
  }
  
  // Default status codes for common errors
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'CastError') return 400;
  if (error.name === 'UnauthorizedError') return 401;
  if (error.name === 'JsonWebTokenError') return 401;
  if (error.name === 'TokenExpiredError') return 401;
  if (error.name === 'MongoError' && (error as any).code === 11000) return 409;
  
  return 500;
};

/**
 * Convert any error to AppError
 */
export const normalizeError = (error: Error | any): AppError => {
  if (isAppError(error)) {
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
  return new AppError(
    error.message || 'An unexpected error occurred',
    500,
    'INTERNAL_ERROR',
    false,
    { originalError: error.name }
  );
};

/**
 * Error handler middleware factory
 */
export const createErrorHandler = (isDevelopment = false) => {
  return async (error: Error, req: any, res: any, next: any) => {
    // Normalize error
    const appError = normalizeError(error);
    
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
    const response: any = {
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

/**
 * Express middleware for handling async errors
 */
export const asyncErrorHandler = (fn: any) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Export main error class and factory
export default AppError;