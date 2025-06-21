/**
 * Authentication Routes
 * 
 * Handles all authentication-related endpoints:
 * - User registration (signup)
 * - User login
 * - Token refresh
 * - Logout
 * - Password reset
 * - Email verification
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../../config/database';
import { sessionUtils, cacheUtils } from '../../config/redis';
import { tokenUtils, authRateLimit, logoutUser, AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { sendEmail } from '../../services/emailService';
import { generateSlug } from '../../utils/helpers';

const router = Router();

/**
 * Validation schemas using Zod
 */
const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z.string()
    .email('Please provide a valid email address')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
});

const loginSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
});

const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .toLowerCase()
});

const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
});

/**
 * POST /api/auth/signup
 * Register a new consultant account
 */
router.post('/signup', 
  authRateLimit,
  validateRequest(signupSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      const prisma = getPrismaClient();

      // Check if user already exists
      const existingUser = await prisma.consultant.findUnique({
        where: { email },
        select: { id: true, isEmailVerified: true }
      });

      if (existingUser) {
        res.status(409).json({
          error: 'Account already exists',
          message: 'An account with this email address already exists',
          code: 'USER_EXISTS'
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // Generate unique slug for consultant page
      const baseSlug = generateSlug(`${firstName}-${lastName}`);
      let slug = baseSlug;
      let slugCounter = 1;

      // Ensure slug is unique
      while (await prisma.consultant.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
      }

      // Create user account
      const user = await prisma.consultant.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          slug,
          phoneNumber: '', // Will be filled in settings
          isActive: true,
          isEmailVerified: false, // Require email verification
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          slug: true,
          isEmailVerified: true,
          createdAt: true
        }
      });

      // Generate email verification token
      const verificationToken = uuidv4();
      await cacheUtils.setWithAutoTTL(
        `email_verification:${verificationToken}`,
        { userId: user.id, email: user.email },
        'mediumCache' // 30 minutes
      );

      // Send verification email
      await sendEmail('email_verification', {
        to: user.email,
        data: {
          firstName: user.firstName,
          verificationLink: `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`
        }
      });

      console.log(`✅ New user registered: ${user.email}`);

      res.status(201).json({
        message: 'Account created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            slug: user.slug,
            isEmailVerified: user.isEmailVerified
          }
        },
        instructions: 'Please check your email and click the verification link to activate your account'
      });

    } catch (error) {
      console.error('❌ Signup error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred while creating your account. Please try again.',
        code: 'SIGNUP_ERROR'
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return access tokens
 */
router.post('/login',
  authRateLimit,
  validateRequest(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const prisma = getPrismaClient();

      // Find user by email
      const user = await prisma.consultant.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          firstName: true,
          lastName: true,
          slug: true,
          isActive: true,
          isEmailVerified: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true
        }
      });

      if (!user) {
        res.status(401).json({
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Check if account is active
      if (!user.isActive) {
        res.status(403).json({
          error: 'Account disabled',
          message: 'Your account has been disabled. Please contact support.',
          code: 'ACCOUNT_DISABLED'
        });
        return;
      }

      // Check email verification in production
      if (process.env.NODE_ENV === 'production' && !user.isEmailVerified) {
        res.status(403).json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        });
        return;
      }

      // Generate session ID
      const sessionId = uuidv4();

      // Store session data in Redis
      const sessionData = {
        userId: user.id,
        email: user.email,
        role: 'consultant',
        loginTime: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'unknown'
      };

      await sessionUtils.setSession(sessionId, sessionData);

      // Generate tokens
      const accessToken = tokenUtils.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: 'consultant',
        consultantSlug: user.slug,
        sessionId
      });

      const refreshToken = tokenUtils.generateRefreshToken(user.id, sessionId);

      // Update last login time (async, don't wait)
      prisma.consultant.update({
        where: { id: user.id },
        data: { updatedAt: new Date() }
      }).catch((err:any) => console.error('Failed to update last login:', err));

      console.log(`✅ User logged in: ${user.email}`);

      res.json({
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            slug: user.slug,
            isEmailVerified: user.isEmailVerified,
            subscriptionPlan: user.subscriptionPlan,
            subscriptionExpiresAt: user.subscriptionExpiresAt
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '15m' // Access token expiry
          }
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login. Please try again.',
        code: 'LOGIN_ERROR'
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const prisma = getPrismaClient();

      // Verify refresh token
      let payload;
      try {
        payload = tokenUtils.verifyRefreshToken(refreshToken);
      } catch (error) {
        res.status(401).json({
          error: 'Invalid refresh token',
          message: 'The refresh token is invalid or expired',
          code: 'INVALID_REFRESH_TOKEN'
        });
        return;
      }

      // Check if session exists
      const sessionData = await sessionUtils.getSession(payload.sessionId);
      if (!sessionData) {
        res.status(401).json({
          error: 'Session expired',
          message: 'Your session has expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
        return;
      }

      // Get fresh user data
      const user = await prisma.consultant.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          slug: true,
          isActive: true,
          isEmailVerified: true
        }
      });

      if (!user || !user.isActive) {
        res.status(401).json({
          error: 'User not found',
          message: 'The user account no longer exists or is inactive',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Generate new access token
      const newAccessToken = tokenUtils.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: 'consultant',
        consultantSlug: user.slug,
        sessionId: payload.sessionId
      });

      // Extend session TTL
      await sessionUtils.extendSession(payload.sessionId);

      res.json({
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          expiresIn: '15m'
        }
      });

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'An error occurred while refreshing your token',
        code: 'REFRESH_ERROR'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessionId = req.sessionId;
    
    if (sessionId) {
      const success = await logoutUser(sessionId);
      if (success) {
        console.log(`✅ User logged out: ${req.user?.email}`);
      }
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    // Always return success for logout, even if session cleanup fails
    res.json({
      message: 'Logout successful'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password',
  authRateLimit,
  validateRequest(forgotPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      const prisma = getPrismaClient();

      // Find user (don't reveal if user exists or not)
      const user = await prisma.consultant.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true }
      });

      if (user) {
        // Generate password reset token
        const resetToken = uuidv4();
        await cacheUtils.setWithAutoTTL(
          `password_reset:${resetToken}`,
          { userId: user.id, email: user.email },
          'mediumCache' // 30 minutes
        );

        // Send password reset email
        await sendEmail('password_reset', {
          to: user.email,
          data: {
            firstName: user.firstName,
            resetLink: `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`
          }
        });
      }

      // Always return success to prevent email enumeration
      res.json({
        message: 'If an account with that email exists, we have sent password reset instructions'
      });

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({
        error: 'Request failed',
        message: 'An error occurred while processing your request',
        code: 'FORGOT_PASSWORD_ERROR'
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password',
  authRateLimit,
  validateRequest(resetPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;
      const prisma = getPrismaClient();

      // Verify reset token
      const resetData = await cacheUtils.get(`password_reset:${token}`);
      if (!resetData) {
        res.status(400).json({
          error: 'Invalid or expired token',
          message: 'The password reset token is invalid or has expired',
          code: 'INVALID_RESET_TOKEN'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update user password
      await prisma.consultant.update({
        where: { id: resetData.userId },
        data: {
          passwordHash,
          updatedAt: new Date()
        }
      });

      // Delete the reset token
      await cacheUtils.delete(`password_reset:${token}`);

      // Invalidate all existing sessions for this user
      // Note: In a more sophisticated setup, you'd track all sessions per user
      
      console.log(`✅ Password reset for user: ${resetData.email}`);

      res.json({
        message: 'Password reset successful. You can now login with your new password.'
      });

    } catch (error) {
      console.error('❌ Password reset error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while resetting your password',
        code: 'RESET_PASSWORD_ERROR'
      });
    }
  }
);

/**
 * GET /api/auth/verify-email
 * Verify email address using token
 */
router.get('/verify-email/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const prisma = getPrismaClient();

    // Verify email token
    const verificationData = await cacheUtils.get(`email_verification:${token}`);
    if (!verificationData) {
      res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The email verification token is invalid or has expired',
        code: 'INVALID_VERIFICATION_TOKEN'
      });
      return;
    }

    // Update user email verification status
    await prisma.consultant.update({
      where: { id: verificationData.userId },
      data: {
        isEmailVerified: true,
        updatedAt: new Date()
      }
    });

    // Delete the verification token
    await cacheUtils.delete(`email_verification:${token}`);

    console.log(`✅ Email verified for user: ${verificationData.email}`);

    res.json({
      message: 'Email verified successfully. You can now access your account.'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      message: 'An error occurred while verifying your email',
      code: 'VERIFICATION_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'You must be logged in to access this resource',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const prisma = getPrismaClient();

    // Get fresh user data
    const user = await prisma.consultant.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        slug: true,
        profilePhotoUrl: true,
        isActive: true,
        isEmailVerified: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'The user account no longer exists',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    res.json({
      data: { user }
    });

  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: 'An error occurred while fetching your profile',
      code: 'PROFILE_ERROR'
    });
  }
});

export default router;