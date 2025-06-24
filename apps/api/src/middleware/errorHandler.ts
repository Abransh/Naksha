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
import { Prisma } from '../../../../packages/database';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error classes for specific scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', originalError);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  details?: any;
  stack?: string;
  requestId?: string;
}

/**
 * Check if error is a known operational error
 */
const isOperationalError = (error: any): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Handle Prisma database errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[] | undefined;
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
const handleJWTError = (error: JsonWebTokenError | TokenExpiredError): AppError => {
  if (error instanceof TokenExpiredError) {
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
const handleZodError = (error: ZodError): ValidationError => {
  const details = error.errors.map(err => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
    value: (err as any).received
  }));

  return new ValidationError('Validation failed', details);
};

/**
 * Handle Multer file upload errors
 */
const handleMulterError = (error: any): AppError => {
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
const sanitizeError = (error: any, isProduction: boolean): Partial<ErrorResponse> => {
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
const logError = (error: any, req: Request): void => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    user: (req as any).user?.id || 'anonymous',
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
  } else {
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
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Main error handler middleware
 * This should be the last middleware in the application
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError: AppError;

  // Convert various error types to our AppError format
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new ValidationError('Invalid data provided to database');
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    appError = new AppError('Database initialization failed', 503, 'DATABASE_INIT_ERROR');
  } else if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    appError = handleJWTError(error);
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error.code && error.code.startsWith('LIMIT_')) {
    // Multer errors
    appError = handleMulterError(error);
  } else if (error.name === 'CastError') {
    // MongoDB ObjectId casting errors
    appError = new ValidationError('Invalid ID format');
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    appError = new ValidationError('Invalid JSON in request body');
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    appError = new ExternalServiceError('External service unavailable');
  } else {
    // Unknown error - create a generic AppError
    appError = new AppError(
      error.message || 'An unexpected error occurred',
      error.statusCode || 500,
      error.code || 'INTERNAL_ERROR'
    );
  }

  // Log the error
  logError(appError, req);

  // Generate request ID for tracking
  const requestId = generateRequestId();

  // Prepare error response
  const isProduction = process.env.NODE_ENV === 'production';
  const sanitizedError = sanitizeError(appError, isProduction);

  const errorResponse: ErrorResponse = {
    ...sanitizedError,
    statusCode: appError.statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId
  } as ErrorResponse;

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch Promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error handling utilities
 */
export const errorUtils = {
  /**
   * Create and throw a custom error
   */
  throw: (
    message: string,
    statusCode: number = 500,
    code: string = 'CUSTOM_ERROR',
    details?: any
  ): never => {
    throw new AppError(message, statusCode, code, details);
  },

  /**
   * Assert a condition and throw error if false
   */
  assert: (
    condition: any,
    message: string,
    statusCode: number = 400,
    code: string = 'ASSERTION_ERROR'
  ): void => {
    if (!condition) {
      throw new AppError(message, statusCode, code);
    }
  },

  /**
   * Wrap a function with error handling
   */
  wrap: <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: any[]) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            throw new AppError(error.message, 500, 'WRAPPED_ERROR');
          });
        }
        return result;
      } catch (error: any) {
        throw new AppError(error.message, 500, 'WRAPPED_ERROR');
      }
    }) as T;
  },

  /**
   * Check if error should be retried
   */
  isRetryable: (error: any): boolean => {
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
export const healthCheckErrors = {
  /**
   * Check if the application is healthy
   */
  checkHealth: async (): Promise<{ healthy: boolean; errors: string[] }> => {
    const errors: string[] = [];

    try {
      // Add health checks here
      // - Database connectivity
      // - Redis connectivity
      // - External service availability
      // - Memory usage
      // - Disk space

      return { healthy: errors.length === 0, errors };
    } catch (error) {
      errors.push('Health check failed');
      return { healthy: false, errors };
    }
  }
};

/**
 * Error handling middleware for specific scenarios
 */
export const specificErrorHandlers = {
  /**
   * Handle payment processing errors
   */
  paymentError: (error: any): AppError => {
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
  emailError: (error: any): AppError => {
    if (error.code === 'EMAIL_SEND_FAILED') {
      return new ExternalServiceError('Email service');
    }
    return new AppError('Email delivery failed', 502, 'EMAIL_ERROR');
  },

  /**
   * Handle file upload service errors
   */
  uploadError: (error: any): AppError => {
    if (error.code === 'STORAGE_FULL') {
      return new AppError('Storage space full', 507, 'STORAGE_FULL');
    }
    if (error.code === 'INVALID_FILE_FORMAT') {
      return new ValidationError('Invalid file format');
    }
    return new AppError('File upload failed', 500, 'UPLOAD_ERROR');
  }
};

export default errorHandler;