"use strict";
// apps/api/src/middleware/auth.ts
// Nakksha Consulting Platform - Authentication Middleware
// Implements JWT authentication with admin approval logic for consultants
// Separate auth systems for consultants vs admins as per CTO decision
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.authRateLimit = exports.tokenUtils = exports.hasPermission = exports.logout = exports.refreshTokens = exports.optionalAuth = exports.authenticateSuperAdmin = exports.authenticateAdmin = exports.authenticateConsultantBasic = exports.authenticateConsultant = exports.authenticate = exports.generateTokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("@nakksha/database");
const logger_1 = require("../utils/logger");
const appError_1 = require("../utils/appError");
const redis_1 = require("../config/redis");
/**
 * Generate JWT tokens for authentication
 */
const generateTokens = async (user, userType) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
    const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
        throw new appError_1.AppError('JWT secrets not configured', 500);
    }
    try {
        // Access token payload
        const accessTokenPayload = userType === 'consultant'
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
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, JWT_SECRET);
        const refreshToken = jsonwebtoken_1.default.sign({ sub: user.id, type: userType }, JWT_REFRESH_SECRET);
        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        await database_1.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                expiresAt,
                consultantId: userType === 'consultant' ? user.id : null,
                adminId: userType === 'admin' ? user.id : null
            }
        });
        // Cache user session in Redis for faster lookups
        const redisClient = (0, redis_1.getRedisClient)();
        await redisClient.setEx(`user_session:${user.id}`, 900, // 15 minutes (same as access token)
        JSON.stringify({
            id: user.id,
            email: user.email,
            role: userType === 'consultant' ? 'consultant' : user.role.toLowerCase(),
            isApproved: userType === 'consultant' ? user.isApprovedByAdmin : true,
            slug: userType === 'consultant' ? user.slug : undefined
        }));
        return { accessToken, refreshToken };
    }
    catch (error) {
        logger_1.logger.error('Error generating tokens:', error);
        throw new appError_1.AppError('Failed to generate authentication tokens', 500);
    }
};
exports.generateTokens = generateTokens;
/**
 * Verify JWT token and extract user information
 */
const verifyToken = async (token) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new appError_1.AppError('JWT secret not configured', 500);
    }
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new appError_1.AppError('Token expired', 401);
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new appError_1.AppError('Invalid token', 401);
        }
        else {
            throw new appError_1.AppError('Token verification failed', 401);
        }
    }
};
/**
 * Basic authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from multiple sources
        let token;
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
        const redisClient = (0, redis_1.getRedisClient)();
        const cachedUser = await redisClient.get(`user_session:${payload.sub}`);
        if (cachedUser) {
            req.user = JSON.parse(cachedUser);
        }
        else {
            // Fallback to database lookup
            if (payload.role === 'consultant') {
                const consultant = await database_1.prisma.consultant.findUnique({
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
            }
            else {
                // Admin user
                const admin = await database_1.prisma.admin.findUnique({
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
            await database_1.prisma.consultant.update({
                where: { id: req.user.id },
                data: { lastLoginAt: new Date() }
            });
        }
        else if (req.user?.role) {
            await database_1.prisma.admin.update({
                where: { id: req.user.id },
                data: { lastLoginAt: new Date() }
            });
        }
        next();
    }
    catch (error) {
        if (error instanceof appError_1.AppError) {
            res.status(error.statusCode).json({
                error: 'Authentication failed',
                message: error.message,
                code: 'AUTH_ERROR'
            });
        }
        else {
            logger_1.logger.error('Authentication error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Authentication verification failed',
                code: 'INTERNAL_ERROR'
            });
        }
    }
};
exports.authenticate = authenticate;
/**
 * Consultant-specific authentication with admin approval check
 * CRITICAL: Implements the admin approval requirement
 */
const authenticateConsultant = async (req, res, next) => {
    // First run basic authentication
    await (0, exports.authenticate)(req, res, () => {
        if (!req.user)
            return; // authenticate already handled the error
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
exports.authenticateConsultant = authenticateConsultant;
/**
 * Consultant authentication that allows unapproved access
 * Used for settings page and profile completion
 */
const authenticateConsultantBasic = async (req, res, next) => {
    await (0, exports.authenticate)(req, res, () => {
        if (!req.user)
            return;
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
exports.authenticateConsultantBasic = authenticateConsultantBasic;
/**
 * Admin-only authentication middleware
 */
const authenticateAdmin = async (req, res, next) => {
    await (0, exports.authenticate)(req, res, () => {
        if (!req.user)
            return;
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
exports.authenticateAdmin = authenticateAdmin;
/**
 * Super admin only authentication
 */
const authenticateSuperAdmin = async (req, res, next) => {
    await (0, exports.authenticate)(req, res, () => {
        if (!req.user)
            return;
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
exports.authenticateSuperAdmin = authenticateSuperAdmin;
/**
 * Optional authentication - continues even if no token provided
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies.accessToken;
    if (!token) {
        next();
        return;
    }
    try {
        await (0, exports.authenticate)(req, res, next);
    }
    catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Refresh token endpoint logic
 */
const refreshTokens = async (req, res) => {
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
            throw new appError_1.AppError('JWT refresh secret not configured', 500);
        }
        const payload = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
        // Check if refresh token exists and is not revoked
        const storedToken = await database_1.prisma.refreshToken.findUnique({
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
        await database_1.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true }
        });
        // Generate new tokens
        const user = storedToken.consultant || storedToken.admin;
        const userType = storedToken.consultant ? 'consultant' : 'admin';
        const tokens = await (0, exports.generateTokens)(user, userType);
        res.json({
            message: 'Tokens refreshed successfully',
            data: tokens
        });
    }
    catch (error) {
        logger_1.logger.error('Refresh token error:', error);
        res.status(401).json({
            error: 'Token refresh failed',
            message: 'Could not refresh authentication tokens',
            code: 'REFRESH_FAILED'
        });
    }
};
exports.refreshTokens = refreshTokens;
/**
 * Logout functionality - revoke refresh tokens
 */
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user?.id;
        if (refreshToken) {
            // Revoke specific refresh token
            await database_1.prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true }
            });
        }
        else if (userId) {
            // Revoke all refresh tokens for user
            await database_1.prisma.refreshToken.updateMany({
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
            const redisClient = (0, redis_1.getRedisClient)();
            await redisClient.del(`user_session:${userId}`);
        }
        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.json({
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: 'Could not complete logout process',
            code: 'LOGOUT_FAILED'
        });
    }
};
exports.logout = logout;
// Utility function to check permissions
const hasPermission = (userRole, requiredPermissions) => {
    const rolePermissions = {
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
exports.hasPermission = hasPermission;
// ============================================================================
// TOKEN UTILITIES - Used by auth routes
// ============================================================================
exports.tokenUtils = {
    /**
     * Generate access token with user payload
     */
    generateAccessToken: (payload) => {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new appError_1.AppError('JWT secret not configured', 500);
        }
        const tokenPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
        };
        return jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET);
    },
    /**
     * Generate refresh token
     */
    generateRefreshToken: (userId, sessionId) => {
        const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
        if (!JWT_REFRESH_SECRET) {
            throw new appError_1.AppError('JWT refresh secret not configured', 500);
        }
        const payload = {
            sub: userId,
            sessionId,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        };
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET);
    },
    /**
     * Verify refresh token
     */
    verifyRefreshToken: (token) => {
        const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
        if (!JWT_REFRESH_SECRET) {
            throw new appError_1.AppError('JWT refresh secret not configured', 500);
        }
        try {
            return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new appError_1.AppError('Refresh token expired', 401);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new appError_1.AppError('Invalid refresh token', 401);
            }
            else {
                throw new appError_1.AppError('Refresh token verification failed', 401);
            }
        }
    }
};
// ============================================================================
// RATE LIMITING
// ============================================================================
// Rate limiter for auth endpoints
const authRateLimit = (req, res, next) => {
    // In production, implement proper rate limiting with Redis
    // For now, allow all requests but log them
    logger_1.logger.info(`Auth request from ${req.ip}: ${req.method} ${req.path}`);
    next();
};
exports.authRateLimit = authRateLimit;
/**
 * Logout user by invalidating session
 */
const logoutUser = async (sessionId) => {
    try {
        const redisClient = (0, redis_1.getRedisClient)();
        const deleted = await redisClient.del(`session:${sessionId}`);
        return deleted > 0;
    }
    catch (error) {
        logger_1.logger.error('Error logging out user:', error);
        return false;
    }
};
exports.logoutUser = logoutUser;
//# sourceMappingURL=auth.js.map