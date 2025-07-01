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
import { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
/**
 * Main Application Class
 * Handles the entire server setup and configuration
 */
declare class App {
    app: Application;
    server: any;
    io: SocketIOServer;
    constructor();
    /**
     * Configure all middleware
     * Order matters here - some middleware must be loaded before others
     */
    private initializeMiddleware;
    /**
     * Initialize all API routes
     * Each route group handles a specific domain of the application
     */
    private initializeRoutes;
    /**
     * Initialize error handling middleware
     * MUST be called after all routes are defined
     */
    private initializeErrorHandling;
    /**
     * Start the server and initialize all connections
     */
    start(): Promise<void>;
    /**
     * Setup graceful shutdown for the server
     * Ensures all connections are properly closed
     */
    private setupGracefulShutdown;
}
declare const app: App;
export default app;
//# sourceMappingURL=index.d.ts.map