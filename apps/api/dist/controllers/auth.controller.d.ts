import { Request, Response } from 'express';
/**
 * Consultant Signup
 * Creates account but requires admin approval for dashboard access
 */
export declare const consultantSignup: (req: Request, res: Response) => Promise<void>;
/**
 * Consultant Login
 * Allows login but restricts dashboard access based on admin approval
 */
export declare const consultantLogin: (req: Request, res: Response) => Promise<void>;
/**
 * Admin Login
 * Separate login system for administrators
 */
export declare const adminLogin: (req: Request, res: Response) => Promise<void>;
/**
 * Verify Email Address
 */
export declare const verifyEmail: (req: Request, res: Response) => Promise<void>;
/**
 * Request Password Reset
 */
export declare const forgotPassword: (req: Request, res: Response) => Promise<void>;
/**
 * Reset Password
 */
export declare const resetPassword: (req: Request, res: Response) => Promise<void>;
/**
 * Get current user profile
 */
export declare const getCurrentUser: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map