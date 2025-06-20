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

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Internal imports
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { validateRequest } from './middleware/validation';

// Route imports
import authRoutes from './routes/auth';
import consultantRoutes from './routes/consultant';
import dashboardRoutes from './routes/dashboard';
import sessionRoutes from './routes/sessions';
import clientRoutes from './routes/clients';
import quotationRoutes from './routes/quotations';
import conversationRoutes from './routes/conversations';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import paymentRoutes from './routes/payments';
import webhookRoutes from './routes/webhooks';

// Service imports
import { setupSocketHandlers } from './services/socketService';
import { startBackgroundJobs } from './services/jobService';
import { setupEmailTemplates } from './services/emailService';

// Load environment variables
dotenv.config();

/**
 * Main Application Class
 * Handles the entire server setup and configuration
 */
class App {
  public app: Application;
  public server: any;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
  }

  /**
   * Configure all middleware
   * Order matters here - some middleware must be loaded before others
   */
  private initializeMiddleware(): void {
    // Security middleware - MUST be first
    this.app.use(helmet({
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
    this.app.use(cors({
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
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Only 5 auth attempts per 15 minutes
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      }
    });

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression for better performance
    this.app.use(compression());

    // Logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Health check endpoint - MUST be before auth middleware
    this.app.get('/health', (req: Request, res: Response) => {
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
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'Nakksha Consulting Platform API',
        version: '1.0.0',
        description: 'Backend API for consultant management platform',
        documentation: '/api/docs',
        status: 'active'
      });
    });

    // Apply auth limiter to auth routes
    this.app.use('/api/auth', authLimiter);
  }

  /**
   * Initialize all API routes
   * Each route group handles a specific domain of the application
   */
  private initializeRoutes(): void {
    // Public routes (no authentication required)
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/webhooks', webhookRoutes); // Razorpay webhooks
    
    // Protected routes (authentication required)
    this.app.use('/api/consultant', authMiddleware, consultantRoutes);
    this.app.use('/api/dashboard', authMiddleware, dashboardRoutes);
    this.app.use('/api/sessions', authMiddleware, sessionRoutes);
    this.app.use('/api/clients', authMiddleware, clientRoutes);
    this.app.use('/api/quotations', authMiddleware, quotationRoutes);
    this.app.use('/api/conversations', authMiddleware, conversationRoutes);
    this.app.use('/api/upload', authMiddleware, uploadRoutes);
    this.app.use('/api/payments', authMiddleware, paymentRoutes);

    // Admin routes (admin authentication required)
    this.app.use('/api/admin', authMiddleware, adminRoutes);

    // API documentation (if in development)
    if (process.env.NODE_ENV === 'development') {
      this.app.get('/api/docs', (req: Request, res: Response) => {
        res.json({
          endpoints: {
            auth: [
              'POST /api/auth/signup',
              'POST /api/auth/login',
              'POST /api/auth/refresh',
              'POST /api/auth/logout',
              'POST /api/auth/forgot-password',
              'POST /api/auth/reset-password'
            ],
            consultant: [
              'GET /api/consultant/profile',
              'PUT /api/consultant/profile',
              'GET /api/consultant/:slug',
              'PUT /api/consultant/availability'
            ],
            dashboard: [
              'GET /api/dashboard/metrics',
              'GET /api/dashboard/analytics',
              'GET /api/dashboard/recent-activity'
            ],
            sessions: [
              'GET /api/sessions',
              'POST /api/sessions',
              'GET /api/sessions/:id',
              'PUT /api/sessions/:id',
              'DELETE /api/sessions/:id'
            ],
            clients: [
              'GET /api/clients',
              'POST /api/clients',
              'GET /api/clients/:id',
              'PUT /api/clients/:id',
              'DELETE /api/clients/:id'
            ],
            quotations: [
              'GET /api/quotations',
              'POST /api/quotations',
              'GET /api/quotations/:id',
              'PUT /api/quotations/:id',
              'DELETE /api/quotations/:id',
              'POST /api/quotations/:id/send'
            ]
          }
        });
      });
    }
  }

  /**
   * Initialize error handling middleware
   * MUST be called after all routes are defined
   */
  private initializeErrorHandling(): void {
    // 404 handler for undefined routes
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Initialize Socket.IO for real-time features
   */
  private initializeSocketIO(): void {
    setupSocketHandlers(this.io);
  }

  /**
   * Start the server and initialize all connections
   */
  public async start(): Promise<void> {
    const PORT = process.env.PORT || 3001;

    try {
      // Initialize database connection
      console.log('🔗 Connecting to database...');
      await connectDatabase();
      console.log('✅ Database connected successfully');

      // Initialize Redis connection
      console.log('🔗 Connecting to Redis...');
      await connectRedis();
      console.log('✅ Redis connected successfully');

      // Setup email templates
      console.log('📧 Setting up email templates...');
      await setupEmailTemplates();
      console.log('✅ Email templates ready');

      // Start background jobs
      console.log('⚙️ Starting background jobs...');
      await startBackgroundJobs();
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

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown for the server
   * Ensures all connections are properly closed
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      this.server.close((err: any) => {
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

export default app;