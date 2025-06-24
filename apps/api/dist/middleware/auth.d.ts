import { Request, Response, NextFunction } from 'express';
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
export declare const generateTokens: (user: any, userType: "consultant" | "admin") => Promise<{
    accessToken: string;
    refreshToken: string;
}>;
/**
 * Basic authentication middleware
 * Verifies JWT token and attaches user to request
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Consultant-specific authentication with admin approval check
 * CRITICAL: Implements the admin approval requirement
 */
export declare const authenticateConsultant: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Consultant authentication that allows unapproved access
 * Used for settings page and profile completion
 */
export declare const authenticateConsultantBasic: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin-only authentication middleware
 */
export declare const authenticateAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Super admin only authentication
 */
export declare const authenticateSuperAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication - continues even if no token provided
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Refresh token endpoint logic
 */
export declare const refreshTokens: (req: Request, res: Response) => Promise<void>;
/**
 * Logout functionality - revoke refresh tokens
 */
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const hasPermission: (userRole: string, requiredPermissions: string[]) => boolean;
export declare const tokenUtils: {
    /**
     * Generate access token with user payload
     */
    generateAccessToken: (payload: {
        sub: string;
        email: string;
        role: string;
        consultantSlug?: string;
        sessionId: string;
    }) => string;
    /**
     * Generate refresh token
     */
    generateRefreshToken: (userId: string, sessionId: string) => string;
    /**
     * Verify refresh token
     */
    verifyRefreshToken: (token: string) => any;
};
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
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
export declare const logoutUser: (sessionId: string) => Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map