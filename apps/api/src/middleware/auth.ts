// apps/api/src/middleware/auth.ts
// Nakksha Consulting Platform - Authentication Middleware
// Implements JWT authentication with admin approval logic for consultants
// Separate auth systems for consultants vs admins as per CTO decision

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@nakksha/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/appError';
import { getRedisClient } from '../config/redis';

// JWT payload interfaces
interface ConsultantJWTPayload {
  sub: string; // consultant ID
  email: string;
  role: 'consultant';
  isApproved: boolean;
  slug?: string;
  iat: number;
  exp: number;
}

interface AdminJWTPayload {
  sub: string; // admin ID
  email: string;
  role: 'admin' | 'super_admin' | 'moderator';
  iat: number;
  exp: number;
}

type JWTPayload = ConsultantJWTPayload | AdminJWTPayload;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isApproved?: boolean;
        slug?: string;
      };
    }
  }
}

/**
 * Generate JWT tokens for authentication
 */
export const generateTokens = async (user: any, userType: 'consultant' | 'admin') => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
  const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new AppError('JWT secrets not configured', 500);
  }

  try {
    // Access token payload
    const accessTokenPayload: ConsultantJWTPayload | AdminJWTPayload = 
      userType === 'consultant' 
        ? {
            sub: user.id,
            email: user.email,
            role: 'consultant',
            isApproved: user.isApprovedByAdmin,
            slug: user.slug,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
          }
        : {
            sub: user.id,
            email: user.email,
            role: user.role.toLowerCase(),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
          };

    // Generate tokens
    const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET);
    const refreshToken = jwt.sign(
      { sub: user.id, type: userType },
      JWT_REFRESH_SECRET
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt,
        consultantId: userType === 'consultant' ? user.id : null,
        adminId: userType === 'admin' ? user.id : null
      }
    });

    // Cache user session in Redis for faster lookups
    const redisClient = getRedisClient();
    await redisClient.setEx(
      `user_session:${user.id}`,
      900, // 15 minutes (same as access token)
      JSON.stringify({
        id: user.id,
        email: user.email,
        role: userType === 'consultant' ? 'consultant' : user.role.toLowerCase(),
        isApproved: userType === 'consultant' ? user.isApprovedByAdmin : true,
        slug: userType === 'consultant' ? user.slug : undefined
      })
    );

    return { accessToken, refreshToken };

  } catch (error) {
    logger.error('Error generating tokens:', error);
    throw new AppError('Failed to generate authentication tokens', 500);
  }
};

/**
 * Verify JWT token and extract user information
 */
const verifyToken = async (token: string): Promise<JWTPayload> => {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    throw new AppError('JWT secret not configured', 500);
  }

  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    } else {
      throw new AppError('Token verification failed', 401);
    }
  }
};

/**
 * Basic authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from multiple sources
    let token: string | undefined;

    // 1. Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Cookie (for web clients)
    if (!token && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // 3. Query parameter (for specific endpoints like file downloads)
    if (!token && req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
      return;
    }

    // Verify token
    const payload = await verifyToken(token);

    // Check if user session exists in Redis (for faster lookups)
    const redisClient = getRedisClient();
    const cachedUser = await redisClient.get(`user_session:${payload.sub}`);
    
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
    } else {
      // Fallback to database lookup
      if (payload.role === 'consultant') {
        const consultant = await prisma.consultant.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            isApprovedByAdmin: true,
            isActive: true,
            slug: true
          }
        });

        if (!consultant || !consultant.isActive) {
          res.status(401).json({
            error: 'Authentication failed',
            message: 'Account not found or inactive',
            code: 'ACCOUNT_INACTIVE'
          });
          return;
        }

        req.user = {
          id: consultant.id,
          email: consultant.email,
          role: 'consultant',
          isApproved: consultant.isApprovedByAdmin,
          slug: consultant.slug
        };
      } else {
        // Admin user
        const admin = await prisma.admin.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        });

        if (!admin || !admin.isActive) {
          res.status(401).json({
            error: 'Authentication failed',
            message: 'Admin account not found or inactive',
            code: 'ACCOUNT_INACTIVE'
          });
          return;
        }

        req.user = {
          id: admin.id,
          email: admin.email,
          role: admin.role.toLowerCase()
        };
      }
    }

    // Update last activity
    if (req.user?.role === 'consultant') {
      await prisma.consultant.update({
        where: { id: req.user.id },
        data: { lastLoginAt: new Date() }
      });
    } else if (req.user?.role) {
      await prisma.admin.update({
        where: { id: req.user.id },
        data: { lastLoginAt: new Date() }
      });
    }

    next();

  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: 'Authentication failed',
        message: error.message,
        code: 'AUTH_ERROR'
      });
    } else {
      logger.error('Authentication error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication verification failed',
        code: 'INTERNAL_ERROR'
      });
    }
  }
};

/**
 * Consultant-specific authentication with admin approval check
 * CRITICAL: Implements the admin approval requirement
 */
export const authenticateConsultant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // First run basic authentication
  await authenticate(req, res, () => {
    if (!req.user) return; // authenticate already handled the error

    // Check if user is a consultant
    if (req.user.role !== 'consultant') {
      res.status(403).json({
        error: 'Access denied',
        message: 'This endpoint is only accessible to consultants',
        code: 'CONSULTANT_ONLY'
      });
      return;
    }

    // CRITICAL CHECK: Admin approval required for dashboard access
    if (!req.user.isApproved) {
      res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is pending admin approval. You can login but cannot access the dashboard until approved.',
        code: 'PENDING_APPROVAL',
        details: {
          canLogin: true,
          canAccessDashboard: false,
          needsAdminApproval: true
        }
      });
      return;
    }

    next();
  });
};

/**
 * Consultant authentication that allows unapproved access
 * Used for settings page and profile completion
 */
export const authenticateConsultantBasic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await authenticate(req, res, () => {
    if (!req.user) return;

    if (req.user.role !== 'consultant') {
      res.status(403).json({
        error: 'Access denied',
        message: 'This endpoint is only accessible to consultants',
        code: 'CONSULTANT_ONLY'
      });
      return;
    }

    // Allow access even if not approved (for profile completion)
    next();
  });
};

/**
 * Admin-only authentication middleware
 */
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await authenticate(req, res, () => {
    if (!req.user) return;

    if (!['admin', 'super_admin', 'moderator'].includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'This endpoint requires administrator privileges',
        code: 'ADMIN_ONLY'
      });
      return;
    }

    next();
  });
};

/**
 * Super admin only authentication
 */
export const authenticateSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await authenticate(req, res, () => {
    if (!req.user) return;

    if (req.user.role !== 'super_admin') {
      res.status(403).json({
        error: 'Access denied',
        message: 'This endpoint requires super administrator privileges',
        code: 'SUPER_ADMIN_ONLY'
      });
      return;
    }

    next();
  });
};

/**
 * Optional authentication - continues even if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies.accessToken;

  if (!token) {
    next();
    return;
  }

  try {
    await authenticate(req, res, next);
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Refresh token endpoint logic
 */
export const refreshTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Refresh token required',
        message: 'No refresh token provided',
        code: 'NO_REFRESH_TOKEN'
      });
      return;
    }

    // Verify refresh token
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_REFRESH_SECRET) {
      throw new AppError('JWT refresh secret not configured', 500);
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    // Check if refresh token exists and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        consultant: true,
        admin: true
      }
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired',
        code: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true }
    });

    // Generate new tokens
    const user = storedToken.consultant || storedToken.admin;
    const userType = storedToken.consultant ? 'consultant' : 'admin';
    
    const tokens = await generateTokens(user, userType);

    res.json({
      message: 'Tokens refreshed successfully',
      data: tokens
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Could not refresh authentication tokens',
      code: 'REFRESH_FAILED'
    });
  }
};

/**
 * Logout functionality - revoke refresh tokens
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (refreshToken) {
      // Revoke specific refresh token
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true }
      });
    } else if (userId) {
      // Revoke all refresh tokens for user
      await prisma.refreshToken.updateMany({
        where: {
          OR: [
            { consultantId: userId },
            { adminId: userId }
          ]
        },
        data: { isRevoked: true }
      });
    }

    // Clear Redis session
    if (userId) {
      const redisClient = getRedisClient();
      await redisClient.del(`user_session:${userId}`);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Could not complete logout process',
      code: 'LOGOUT_FAILED'
    });
  }
};

// Utility function to check permissions
export const hasPermission = (userRole: string, requiredPermissions: string[]): boolean => {
  const rolePermissions: Record<string, string[]> = {
    'super_admin': ['*'], // All permissions
    'admin': ['read:consultants', 'update:consultants', 'read:sessions', 'read:analytics'],
    'moderator': ['read:consultants', 'read:sessions'],
    'consultant': ['read:own', 'update:own', 'create:sessions', 'read:own_clients']
  };

  const userPermissions = rolePermissions[userRole] || [];
  
  if (userPermissions.includes('*')) {
    return true;
  }

  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

// ============================================================================
// TOKEN UTILITIES - Used by auth routes
// ============================================================================

export const tokenUtils = {
  /**
   * Generate access token with user payload
   */
  generateAccessToken: (payload: {
    sub: string;
    email: string;
    role: string;
    consultantSlug?: string;
    sessionId: string;
  }): string => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new AppError('JWT secret not configured', 500);
    }

    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };

    return jwt.sign(tokenPayload, JWT_SECRET);
  },

  /**
   * Generate refresh token
   */
  generateRefreshToken: (userId: string, sessionId: string): string => {
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_REFRESH_SECRET) {
      throw new AppError('JWT refresh secret not configured', 500);
    }

    const payload = {
      sub: userId,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET);
  },

  /**
   * Verify refresh token
   */
  verifyRefreshToken: (token: string): any => {
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_REFRESH_SECRET) {
      throw new AppError('JWT refresh secret not configured', 500);
    }

    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      } else {
        throw new AppError('Refresh token verification failed', 401);
      }
    }
  }
};

// ============================================================================
// RATE LIMITING
// ============================================================================

// Rate limiter for auth endpoints
export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // In production, implement proper rate limiting with Redis
  // For now, allow all requests but log them
  logger.info(`Auth request from ${req.ip}: ${req.method} ${req.path}`);
  next();
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    isApproved?: boolean;
    slug?: string;
  };
  sessionId?: string;
}

/**
 * Logout user by invalidating session
 */
export const logoutUser = async (sessionId: string): Promise<boolean> => {
  try {
    const redisClient = getRedisClient();
    const deleted = await redisClient.del(`session:${sessionId}`);
    return deleted > 0;
  } catch (error) {
    logger.error('Error logging out user:', error);
    return false;
  }
};