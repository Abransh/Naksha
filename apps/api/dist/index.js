"use strict";
/**
 * Nakksha Consulting Platform - Main API Server
 *
 * This is the entry point for our Express.js API server.
 * It handles all the core setup including middleware, routing, and error handling.
 *
 * Key Features:
 * - Express.js with TypeScript
 * - Security middleware (Helmet, CORS, Rate Limiting)
 * - Authentication with JWT
 * - Real-time communication with Socket.io
 * - Redis for caching and session management
 * - Comprehensive error handling
 * - Health checks and monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
// Internal imports
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
// Route imports
const consultant_1 = __importDefault(require("./routes/v1/consultant"));
const dashboard_1 = __importDefault(require("./routes/v1/dashboard"));
const sessions_1 = __importDefault(require("./routes/v1/sessions"));
const clients_1 = __importDefault(require("./routes/v1/clients"));
const quotations_1 = __importDefault(require("./routes/v1/quotations"));
const admin_1 = __importDefault(require("./routes/v1/admin"));
const teams_1 = __importDefault(require("./routes/v1/teams"));
const availability_1 = __importDefault(require("./routes/v1/availability"));
// Controller imports for direct routing
const auth_controller_1 = require("./controllers/auth.controller");
const auth_2 = require("./middleware/auth");
// Service imports
//import { setupSocketHandlers } from './services/socketService';
const jobService_1 = require("./services/jobService");
//import { setupEmailTemplates } from './services/emailService';
// Load environment variables
dotenv_1.default.config();
/**
 * Main Application Class
 * Handles the entire server setup and configuration
 */
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
        // this.initializeSocketIO();
    }
    /**
     * Configure all middleware
     * Order matters here - some middleware must be loaded before others
     */
    initializeMiddleware() {
        // Security middleware - MUST be first
        this.app.use((0, helmet_1.default)({
            crossOriginEmbedderPolicy: false, // Required for file uploads
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: [
                'http://localhost:3000', // Dashboard dev
                'http://localhost:3001', // Public site dev
                process.env.FRONTEND_URL || '',
                process.env.DASHBOARD_URL || '',
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        }));
        // Rate limiting - Prevent abuse
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5000, // Limit each IP to 1000 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use(limiter);
        // Stricter rate limiting for auth endpoints (login/signup only)
        const authLimiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 50, // Increased from 5 to 10 auth attempts per 15 minutes
            message: {
                error: 'Too many authentication attempts, please try again later.',
                retryAfter: '15 minutes'
            },
            skip: (req) => {
                // Skip rate limiting for token refresh and profile endpoints
                return req.path.includes('/refresh') ||
                    req.path.includes('/me') ||
                    req.path.includes('/logout');
            }
        });
        // More lenient rate limiting for profile updates
        const profileLimiter = (0, express_rate_limit_1.default)({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 50, // 50 requests per 5 minutes for profile operations
            message: {
                error: 'Too many profile update attempts, please try again later.',
                retryAfter: '5 minutes'
            }
        });
        // Body parsing middleware
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Compression for better performance
        this.app.use((0, compression_1.default)());
        // Logging middleware
        if (process.env.NODE_ENV === 'development') {
            this.app.use((0, morgan_1.default)('dev'));
        }
        else {
            this.app.use((0, morgan_1.default)('combined'));
        }
        // Health check endpoint - MUST be before auth middleware
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                memory: process.memoryUsage(),
                pid: process.pid
            });
        });
        // API info endpoint
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'Nakksha Consulting Platform API',
                version: '1.0.0',
                description: 'Backend API for consultant management platform',
                documentation: '/api/docs',
                status: 'active'
            });
        });
        // Apply auth limiter to auth routes
        this.app.use('/api/v1/auth', authLimiter);
        // Apply profile limiter to consultant routes
        this.app.use('/api/v1/consultant', profileLimiter);
    }
    /**
     * Initialize all API routes
     * Each route group handles a specific domain of the application
     */
    initializeRoutes() {
        // Public auth routes (no authentication required) - v1 API
        this.app.post('/api/v1/auth/signup', auth_controller_1.consultantSignup);
        this.app.post('/api/v1/auth/login', auth_controller_1.consultantLogin);
        this.app.post('/api/v1/auth/admin/login', auth_controller_1.adminLogin);
        this.app.get('/api/v1/auth/verify-email/:token', auth_controller_1.verifyEmail);
        this.app.post('/api/v1/auth/forgot-password', auth_controller_1.forgotPassword);
        this.app.post('/api/v1/auth/reset-password', auth_controller_1.resetPassword);
        // Protected auth routes (authentication required) - v1 API
        this.app.get('/api/v1/auth/me', auth_1.authenticate, auth_controller_1.getCurrentUser);
        this.app.post('/api/v1/auth/refresh', auth_2.refreshTokens);
        this.app.post('/api/v1/auth/logout', auth_1.authenticate, auth_2.logout);
        // Protected routes (authentication required)
        this.app.use('/api/v1/consultant', consultant_1.default);
        this.app.use('/api/v1/dashboard', auth_1.authenticateConsultant, dashboard_1.default);
        this.app.use('/api/v1/sessions', auth_1.authenticateConsultant, sessions_1.default);
        this.app.use('/api/v1/clients', auth_1.authenticateConsultant, clients_1.default);
        this.app.use('/api/v1/quotations', auth_1.authenticateConsultant, quotations_1.default);
        this.app.use('/api/v1/teams', auth_1.authenticateConsultant, teams_1.default);
        this.app.use('/api/v1/availability', availability_1.default);
        // Admin routes (admin authentication required)
        this.app.use('/api/v1/admin', auth_1.authenticateAdmin, admin_1.default);
        // API documentation (if in development)
        if (process.env.NODE_ENV === 'development') {
            this.app.get('/api/docs', (req, res) => {
                res.json({
                    name: 'Nakksha Consulting Platform API',
                    version: '1.0.0',
                    description: 'Backend API for consultant management platform with admin approval workflow',
                    baseUrl: '/api',
                    endpoints: {
                        authentication: {
                            consultant: [
                                'POST /api/v1/auth/signup - Register new consultant',
                                'POST /api/v1/auth/login - Consultant login',
                                'GET /api/v1/auth/verify-email/:token - Verify email address',
                                'POST /api/v1/auth/forgot-password - Request password reset',
                                'POST /api/v1/auth/reset-password - Reset password with token'
                            ],
                            admin: [
                                'POST /api/v1/auth/admin/login - Admin login'
                            ],
                            common: [
                                'GET /api/v1/auth/me - Get current user info (protected)',
                                'POST /api/v1/auth/refresh - Refresh access token',
                                'POST /api/v1/auth/logout - Logout user (protected)'
                            ]
                        },
                        consultant: [
                            'GET /api/v1/consultant/profile - Get consultant profile',
                            'PUT /api/v1/consultant/profile - Update consultant profile',
                            'GET /api/v1/consultant/:slug - Get public consultant page',
                            'POST /api/v1/consultant/availability - Create availability slots',
                            'GET /api/v1/consultant/availability - Get availability slots',
                            'PUT /api/v1/consultant/availability - Update availability slots',
                            'DELETE /api/v1/consultant/availability/:id - Delete availability slot'
                        ],
                        dashboard: [
                            'GET /api/v1/dashboard/metrics - Get dashboard metrics',
                            'GET /api/v1/dashboard/charts - Get chart data',
                            'GET /api/v1/dashboard/recent-activity - Get recent activity',
                            'GET /api/v1/dashboard/summary - Get quick summary stats'
                        ],
                        sessions: [
                            'GET /api/v1/sessions - List sessions',
                            'POST /api/v1/sessions - Create new session',
                            'GET /api/v1/sessions/:id - Get session details',
                            'PUT /api/v1/sessions/:id - Update session',
                            'DELETE /api/v1/sessions/:id - Cancel session'
                        ],
                        clients: [
                            'GET /api/v1/clients - List clients',
                            'POST /api/v1/clients - Create new client',
                            'GET /api/v1/clients/:id - Get client details',
                            'PUT /api/v1/clients/:id - Update client',
                            'DELETE /api/v1/clients/:id - Delete client'
                        ],
                        quotations: [
                            'GET /api/v1/quotations - List quotations',
                            'POST /api/v1/quotations - Create new quotation',
                            'GET /api/v1/quotations/:id - Get quotation details',
                            'PUT /api/v1/quotations/:id - Update quotation',
                            'DELETE /api/v1/quotations/:id - Delete quotation',
                            'POST /api/v1/quotations/:id/send - Send quotation to client'
                        ],
                        admin: [
                            'GET /api/v1/admin/dashboard - Admin dashboard overview',
                            'GET /api/v1/admin/consultants - List all consultants',
                            'GET /api/v1/admin/consultants/:id - Get consultant details',
                            'POST /api/v1/admin/consultants/approve - Approve/reject consultant (CRITICAL)',
                            'PUT /api/v1/admin/consultants/:id - Update consultant info',
                            'POST /api/v1/admin/admins - Create new admin (Super Admin only)',
                            'GET /api/v1/admin/admins - List all admins (Super Admin only)',
                            'GET /api/v1/admin/system/health - System health status'
                        ]
                    },
                    features: {
                        'Admin Approval Workflow': 'Consultants require admin approval before accessing dashboard',
                        'Separate Authentication': 'Different auth systems for consultants and admins',
                        'Real-time Updates': 'Socket.io integration for live updates',
                        'File Uploads': 'Cloudinary integration for profile photos and documents',
                        'Email Notifications': 'Automated email system with templates',
                        'Analytics': 'Comprehensive dashboard metrics and reporting',
                        'Security': 'JWT tokens, rate limiting, input validation'
                    }
                });
            });
        }
    }
    /**
     * Initialize error handling middleware
     * MUST be called after all routes are defined
     */
    initializeErrorHandling() {
        // 404 handler for undefined routes
        this.app.use(errorHandler_1.notFoundHandler);
        // Global error handler
        this.app.use(errorHandler_1.errorHandler);
    }
    // /**
    //  * Initialize Socket.IO for real-time features
    //  */
    // private initializeSocketIO(): void {
    //   setupSocketHandlers(this.io);
    // }
    /**
     * Start the server and initialize all connections
     */
    async start() {
        const PORT = process.env.PORT || 3001;
        try {
            // Initialize database connection
            console.log('🔗 Connecting to database...');
            await (0, database_1.connectDatabase)();
            console.log('✅ Database connected successfully');
            // Initialize Redis connection
            console.log('🔗 Connecting to Redis...');
            await (0, redis_1.connectRedis)();
            console.log('✅ Redis connected successfully');
            // Setup email templates
            console.log('📧 Setting up email templates...');
            // await setupEmailTemplates();
            console.log('✅ Email templates ready');
            // Start background jobs
            console.log('⚙️ Starting background jobs...');
            await (0, jobService_1.startBackgroundJobs)();
            console.log('✅ Background jobs started');
            // Start the HTTP server
            this.server.listen(PORT, () => {
                console.log(`
🚀 Nakksha API Server is running!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
💾 Database: Connected
🔄 Redis: Connected
📊 Health Check: http://localhost:${PORT}/health
📚 API Docs: http://localhost:${PORT}/api/docs
        `);
            });
            // Graceful shutdown handling
            this.setupGracefulShutdown();
        }
        catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }
    /**
     * Setup graceful shutdown for the server
     * Ensures all connections are properly closed
     */
    setupGracefulShutdown() {
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            this.server.close((err) => {
                if (err) {
                    console.error('❌ Error during server shutdown:', err);
                    process.exit(1);
                }
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
            // Force close after 30 seconds
            setTimeout(() => {
                console.error('❌ Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
}
// Create and start the application
const app = new App();
// Start the server
app.start().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map