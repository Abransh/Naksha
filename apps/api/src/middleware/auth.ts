/**
 * Authentication Middleware
 * 
 * This module provides comprehensive authentication and authorization:
 * - JWT token validation
 * - User session management
 * - Role-based access control
 * - Rate limiting integration
 * - Security headers
 * - Request logging and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getPrismaClient } from '../config/database';
import { sessionUtils, rateLimitUtils } from '../config/redis';

/**
 * Extended Request interface to include user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'consultant' | 'admin';
    firstName?: string;
    lastName?: string;
    consultantSlug?: string;
    isActive: boolean;
    emailVerified: boolean;
  };
  sessionId?: string;
}

/**
 * JWT Payload interface
 */
interface TokenPayload extends JwtPayload {
  sub: string; // user ID
  email: string;
  role: 'consultant' | 'admin';
  consultantSlug?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Authentication configuration
 */
const authConfig = {
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  
  // Token expiry times
  accessTokenExpiry: '15m',  // 15 minutes
  refreshTokenExpiry: '7d',  // 7 days
  
  // Rate limiting for auth endpoints
  maxLoginAttempts: 5,
  loginWindowMinutes: 15,
  
  // Security settings
  requireEmailVerification: process.env.NODE_ENV === 'production',
  allowInactiveUsers: false,
};

/**
 * Main authentication middleware
 * Validates JWT tokens and populates req.user with authenticated user data
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No valid authentication token provided',
        code: 'NO_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, authConfig.jwtSecret) as TokenPayload;
    } catch (jwtError: any) {
      console.log(`🔐 JWT verification failed: ${jwtError.message}`);
      
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      
      res.status(401).json({
        error: 'Invalid token',
        message: 'The provided authentication token is invalid',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if session exists in Redis
    const sessionData = await sessionUtils.getSession(payload.sessionId);
    if (!sessionData) {
      res.status(401).json({
        error: 'Session expired',
        message: 'Your session is no longer valid. Please login again.',
        code: 'SESSION_EXPIRED'
      });
      return;
    }

    // Get user from database
    const prisma = getPrismaClient();
    let user;

    if (payload.role === 'consultant') {
      user = await prisma.consultant.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          slug: true,
          isActive: true,
          emailVerified: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
        }
      });
    } else if (payload.role === 'admin') {
      user = await prisma.admin.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        }
      });
    }

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'The authenticated user no longer exists',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Check if user is active
    if (payload.role === 'consultant' && !authConfig.allowInactiveUsers && !user.isActive) {
      res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    // Check email verification in production
    if (authConfig.requireEmailVerification && 
        payload.role === 'consultant' && 
        !user.emailVerified) {
      res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address to continue',
        code: 'EMAIL_NOT_VERIFIED'
      });
      return;
    }

    // Check subscription status for consultants
    if (payload.role === 'consultant' && user.subscriptionExpiresAt) {
      if (new Date() > user.subscriptionExpiresAt) {
        res.status(403).json({
          error: 'Subscription expired',
          message: 'Your subscription has expired. Please renew to continue.',
          code: 'SUBSCRIPTION_EXPIRED'
        });
        return;
      }
    }

    // Populate user data in request
    req.user = {
      id: user.id,
      email: user.email,
      role: payload.role,
      firstName: payload.role === 'consultant' ? user.firstName : undefined,
      lastName: payload.role === 'consultant' ? user.lastName : undefined,
      consultantSlug: payload.role === 'consultant' ? user.slug : undefined,
      isActive: payload.role === 'consultant' ? user.isActive : true,
      emailVerified: payload.role === 'consultant' ? user.emailVerified : true,
    };

    req.sessionId = payload.sessionId;

    // Extend session TTL
    await sessionUtils.extendSession(payload.sessionId);

    // Log successful authentication (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ User authenticated: ${user.email} (${payload.role})`);
    }

    next();

  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based authorization middleware
 * Restricts access to specific user roles
 */
export const requireRole = (allowedRoles: Array<'consultant' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires ${allowedRoles.join(' or ')} access`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Consultant-only authorization middleware
 */
export const requireConsultant = requireRole(['consultant']);

/**
 * Optional authentication middleware
 * Populates user data if token is provided, but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    next();
    return;
  }

  try {
    // Try to authenticate, but don't fail if it doesn't work
    await authMiddleware(req, res, next);
  } catch (error) {
    // Authentication failed, but continue anyway
    console.log('🔓 Optional auth failed, continuing without authentication');
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = req.ip || 'unknown';
    const { allowed, remaining, resetTime } = await rateLimitUtils.checkRateLimit(
      `auth:${identifier}`,
      authConfig.maxLoginAttempts,
      authConfig.loginWindowMinutes * 60
    );

    if (!allowed) {
      res.status(429).json({
        error: 'Too many attempts',
        message: `Too many authentication attempts. Try again after ${new Date(resetTime).toLocaleString()}`,
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
      return;
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': authConfig.maxLoginAttempts.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString()
    });

    next();
  } catch (error) {
    console.error('❌ Rate limit check failed:', error);
    // Fail open - allow request if Redis is down
    next();
  }
};

/**
 * JWT token utilities
 */
export const tokenUtils = {
  /**
   * Generate access token
   */
  generateAccessToken: (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.accessTokenExpiry,
      issuer: 'nakksha-api',
      audience: 'nakksha-app'
    });
  },

  /**
   * Generate refresh token
   */
  generateRefreshToken: (userId: string, sessionId: string): string => {
    return jwt.sign(
      { sub: userId, sessionId, type: 'refresh' },
      authConfig.jwtRefreshSecret,
      {
        expiresIn: authConfig.refreshTokenExpiry,
        issuer: 'nakksha-api',
        audience: 'nakksha-app'
      }
    );
  },

  /**
   * Verify refresh token
   */
  verifyRefreshToken: (token: string): any => {
    try {
      return jwt.verify(token, authConfig.jwtRefreshSecret);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  },

  /**
   * Extract token from request
   */
  extractToken: (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  },

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken: (token: string): any => {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
};

/**
 * Security middleware for additional protection
 */
export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  next();
};

/**
 * Logout utility to invalidate sessions
 */
export const logoutUser = async (sessionId: string): Promise<boolean> => {
  try {
    return await sessionUtils.deleteSession(sessionId);
  } catch (error) {
    console.error('❌ Error during logout:', error);
    return false;
  }
};

/**
 * Authentication testing utilities
 * Only available in development/test environments
 */
export const authTestUtils = process.env.NODE_ENV !== 'production' ? {
  /**
   * Generate test token for testing
   */
  generateTestToken: (userId: string, role: 'consultant' | 'admin' = 'consultant'): string => {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      email: 'test@example.com',
      role,
      sessionId: 'test-session-id'
    };
    
    return tokenUtils.generateAccessToken(payload);
  },

  /**
   * Create test session
   */
  createTestSession: async (userId: string, role: 'consultant' | 'admin' = 'consultant'): Promise<string> => {
    const sessionId = `test-session-${Date.now()}`;
    const sessionData = {
      userId,
      role,
      loginTime: new Date().toISOString(),
      ip: '127.0.0.1',
      userAgent: 'test-agent'
    };
    
    await sessionUtils.setSession(sessionId, sessionData);
    return sessionId;
  }
} : {};

export default authMiddleware;