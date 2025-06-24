// apps/api/src/controllers/auth.controller.ts
// Nakksha Consulting Platform - Authentication Controller
// Handles consultant signup, login, admin approval workflow, and password management
// Implements separate auth systems as per CTO decision

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@nakksha/database';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/appError';
import { generateTokens } from '../middleware/auth';
import { CacheManager } from '../config/redis';
import { sendEmail } from '../services/emailService';
import { generateSlug } from '../utils/helpers';

// Using shared prisma instance from @nakksha/database

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Smart name parsing function as per CEO specification:
 * - 1 word: firstName = word, lastName = ""
 * - 2 words: firstName = first word, lastName = second word
 * - 3+ words: firstName = first word, lastName = remaining words joined
 */
function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
  
  if (nameParts.length === 0) {
    throw new AppError('Name cannot be empty', 400);
  } else if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: ''
    };
  } else if (nameParts.length === 2) {
    return {
      firstName: nameParts[0],
      lastName: nameParts[1]
    };
  } else {
    // 3+ words: first word is firstName, rest are lastName
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ')
    };
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const consultantSignupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character')
});

const consultantLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character')
});

// ============================================================================
// CONSULTANT AUTHENTICATION
// ============================================================================

/**
 * Consultant Signup
 * Creates account but requires admin approval for dashboard access
 */
export const consultantSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validatedData = consultantSignupSchema.parse(req.body);

    // Parse full name into firstName and lastName using smart parsing
    const { firstName, lastName } = parseFullName(validatedData.name);

    // Check if consultant already exists
    const existingConsultant = await prisma.consultant.findUnique({
      where: { email: validatedData.email.toLowerCase() }
    });

    if (existingConsultant) {
      res.status(409).json({
        error: 'Account already exists',
        message: 'An account with this email address already exists',
        code: 'EMAIL_EXISTS'
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Generate unique slug from parsed name
    const baseSlug = generateSlug(`${firstName} ${lastName}`.trim());
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (await prisma.consultant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create consultant account
    const consultant = await prisma.consultant.create({
      data: {
        email: validatedData.email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phoneCountryCode: '+91', // Default for MVP
        phoneNumber: '', // Empty for MVP - to be filled in profile
        slug,
        isEmailVerified: false,
        isApprovedByAdmin: false, // CRITICAL: Requires admin approval
        profileCompleted: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        slug: true,
        isApprovedByAdmin: true,
        profileCompleted: true,
        createdAt: true
      }
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours

    // Store verification token in Redis
    await CacheManager.set(
      `email_verification:${verificationToken}`,
      {
        consultantId: consultant.id,
        email: consultant.email,
        type: 'email_verification'
      },
      24 * 60 * 60 // 24 hours
    );

    // Send welcome email with verification link
    await sendEmail('consultant_welcome', {
      to: consultant.email,
      data: {
        firstName: consultant.firstName,
        verificationLink: `${process.env.CONSULTANT_DASHBOARD_URL}/auth/verify-email?token=${verificationToken}`,
        dashboardUrl: process.env.CONSULTANT_DASHBOARD_URL
      }
    });

    // Notify admins about new consultant signup
    await sendEmail('admin_new_consultant', {
      to: process.env.ADMIN_EMAIL || 'admin@nakksha.com',
      data: {
        consultantName: `${consultant.firstName} ${consultant.lastName}`,
        consultantEmail: consultant.email,
        adminDashboardUrl: `${process.env.ADMIN_DASHBOARD_URL}/consultants/${consultant.id}`,
        signupDate: consultant.createdAt.toDateString()
      }
    });

    // Log successful signup
    logger.info(`New consultant signup: ${consultant.email} (ID: ${consultant.id})`);

    res.status(201).json({
      message: 'Account created successfully',
      data: {
        consultant: {
          id: consultant.id,
          email: consultant.email,
          firstName: consultant.firstName,
          lastName: consultant.lastName,
          slug: consultant.slug,
          isApprovedByAdmin: consultant.isApprovedByAdmin,
          profileCompleted: consultant.profileCompleted
        },
        nextSteps: {
          verifyEmail: true,
          completeProfile: true,
          awaitAdminApproval: true
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input data',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    } else {
      logger.error('Consultant signup error:', error);
      res.status(500).json({
        error: 'Signup failed',
        message: 'Could not create account. Please try again.',
        code: 'SIGNUP_ERROR'
      });
    }
  }
};

/**
 * Consultant Login
 * Allows login but restricts dashboard access based on admin approval
 */
export const consultantLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const { email, password } = consultantLoginSchema.parse(req.body);

    // Find consultant
    const consultant = await prisma.consultant.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        slug: true,
        isEmailVerified: true,
        isApprovedByAdmin: true,
        isActive: true,
        profileCompleted: true,
        lastLoginAt: true
      }
    });

    if (!consultant) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Check if account is active
    if (!consultant.isActive) {
      res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.',
        code: 'ACCOUNT_DISABLED'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, consultant.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Generate JWT tokens
    const tokens = await generateTokens(consultant, 'consultant');

    // Update last login
    await prisma.consultant.update({
      where: { id: consultant.id },
      data: { lastLoginAt: new Date() }
    });

    // Set secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    // Prepare response with access status
    const responseData = {
      consultant: {
        id: consultant.id,
        email: consultant.email,
        firstName: consultant.firstName,
        lastName: consultant.lastName,
        slug: consultant.slug,
        isEmailVerified: consultant.isEmailVerified,
        isApprovedByAdmin: consultant.isApprovedByAdmin,
        profileCompleted: consultant.profileCompleted
      },
      tokens,
      permissions: {
        canLogin: true,
        canAccessDashboard: consultant.isApprovedByAdmin, // CRITICAL: Admin approval check
        canCompleteProfile: true,
        needsEmailVerification: !consultant.isEmailVerified,
        needsProfileCompletion: !consultant.profileCompleted,
        needsAdminApproval: !consultant.isApprovedByAdmin
      }
    };

    // Log successful login
    logger.info(`Consultant login: ${consultant.email} (Approved: ${consultant.isApprovedByAdmin})`);

    res.json({
      message: 'Login successful',
      data: responseData
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input data',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    } else {
      logger.error('Consultant login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Could not complete login. Please try again.',
        code: 'LOGIN_ERROR'
      });
    }
  }
};

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Admin Login
 * Separate login system for administrators
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const { email, password } = adminLoginSchema.parse(req.body);

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true
      }
    });

    if (!admin) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid admin credentials',
        code: 'INVALID_ADMIN_CREDENTIALS'
      });
      return;
    }

    // Check if account is active
    if (!admin.isActive) {
      res.status(403).json({
        error: 'Account disabled',
        message: 'Your admin account has been disabled',
        code: 'ADMIN_ACCOUNT_DISABLED'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid admin credentials',
        code: 'INVALID_ADMIN_CREDENTIALS'
      });
      return;
    }

    // Generate JWT tokens
    const tokens = await generateTokens(admin, 'admin');

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    // Set secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000
    };

    res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    // Log admin login
    logger.info(`Admin login: ${admin.email} (Role: ${admin.role})`);

    res.json({
      message: 'Admin login successful',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        },
        tokens,
        permissions: {
          canManageConsultants: true,
          canViewAnalytics: true,
          canManageSettings: admin.role === 'SUPER_ADMIN'
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input data',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    } else {
      logger.error('Admin login error:', error);
      res.status(500).json({
        error: 'Admin login failed',
        message: 'Could not complete admin login',
        code: 'ADMIN_LOGIN_ERROR'
      });
    }
  }
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Verify Email Address
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    // Get verification data from Redis
    const verificationData = await CacheManager.get(`email_verification:${token}`);

    if (!verificationData) {
      res.status(400).json({
        error: 'Invalid verification token',
        message: 'The verification link is invalid or has expired',
        code: 'INVALID_VERIFICATION_TOKEN'
      });
      return;
    }

    // Update consultant email verification status
    await prisma.consultant.update({
      where: { id: verificationData.consultantId },
      data: { isEmailVerified: true }
    });

    // Remove verification token from Redis
    await CacheManager.del(`email_verification:${token}`);

    logger.info(`Email verified for consultant: ${verificationData.email}`);

    res.json({
      message: 'Email verified successfully',
      data: {
        isEmailVerified: true,
        nextStep: 'Complete your profile to get started'
      }
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'Could not verify email address',
      code: 'VERIFICATION_ERROR'
    });
  }
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Request Password Reset
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Check if consultant exists
    const consultant = await prisma.consultant.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, firstName: true }
    });

    // Always return success to prevent email enumeration
    if (!consultant) {
      res.json({
        message: 'If an account with this email exists, a password reset link has been sent'
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store reset token in Redis (1 hour expiry)
    await CacheManager.set(
      `password_reset:${resetToken}`,
      {
        consultantId: consultant.id,
        email: consultant.email,
        type: 'password_reset'
      },
      60 * 60 // 1 hour
    );

    // Send password reset email
    await sendEmail('password_reset', {
      to: consultant.email,
      data: {
        firstName: consultant.firstName,
        resetLink: `${process.env.CONSULTANT_DASHBOARD_URL}/auth/reset-password?token=${resetToken}`
      }
    });

    logger.info(`Password reset requested for: ${consultant.email}`);

    res.json({
      message: 'If an account with this email exists, a password reset link has been sent'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please provide a valid email address',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    } else {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Reset request failed',
        message: 'Could not process password reset request',
        code: 'RESET_REQUEST_ERROR'
      });
    }
  }
};

/**
 * Reset Password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Get reset data from Redis
    const resetData = await CacheManager.get(`password_reset:${token}`);

    if (!resetData) {
      res.status(400).json({
        error: 'Invalid reset token',
        message: 'The password reset link is invalid or has expired',
        code: 'INVALID_RESET_TOKEN'
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update consultant password
    await prisma.consultant.update({
      where: { id: resetData.consultantId },
      data: { 
        passwordHash,
        // Revoke all existing refresh tokens for security
        refreshTokens: {
          updateMany: {
            where: { consultantId: resetData.consultantId },
            data: { isRevoked: true }
          }
        }
      }
    });

    // Remove reset token from Redis
    await CacheManager.del(`password_reset:${token}`);

    // Clear user session from Redis
    await CacheManager.del(`user_session:${resetData.consultantId}`);

    logger.info(`Password reset completed for: ${resetData.email}`);

    res.json({
      message: 'Password reset successfully',
      data: {
        passwordReset: true,
        nextStep: 'Please login with your new password'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input data',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    } else {
      logger.error('Reset password error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'Could not reset password',
        code: 'RESET_ERROR'
      });
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'No user information available',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (req.user.role === 'consultant') {
      const consultant = await prisma.consultant.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          slug: true,
          isEmailVerified: true,
          isApprovedByAdmin: true,
          isActive: true,
          profileCompleted: true,
          createdAt: true,
          lastLoginAt: true
        }
      });

      res.json({
        message: 'User profile retrieved',
        data: {
          user: consultant,
          type: 'consultant',
          permissions: {
            canAccessDashboard: consultant?.isApprovedByAdmin || false,
            needsProfileCompletion: !consultant?.profileCompleted
          }
        }
      });
    } else {
      const admin = await prisma.admin.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true
        }
      });

      res.json({
        message: 'Admin profile retrieved',
        data: {
          user: admin,
          type: 'admin',
          permissions: {
            canManageConsultants: true,
            canViewAnalytics: true,
            canManageSettings: admin?.role === 'SUPER_ADMIN'
          }
        }
      });
    }

  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Profile retrieval failed',
      message: 'Could not retrieve user profile',
      code: 'PROFILE_ERROR'
    });
  }
};