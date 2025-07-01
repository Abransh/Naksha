"use strict";
/**
 * Database Configuration and Connection Manager
 *
 * This module handles:
 * - Prisma client initialization
 * - Database connection management
 * - Connection health checks
 * - Graceful disconnection
 * - Error handling and reconnection logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbTestUtils = exports.dbUtils = exports.getPrismaClient = exports.executeTransaction = exports.getDatabaseInfo = exports.checkDatabaseHealth = exports.disconnectDatabase = exports.connectDatabase = exports.initializePrisma = void 0;
const database_1 = require("@nakksha/database");
/**
 * Global Prisma client instance
 * Using singleton pattern to ensure single connection across the app
 */
let prisma;
/**
 * Database connection configuration
 */
const databaseConfig = {
    // Connection pool settings
    connectionLimit: 20,
    // Connection timeout settings
    connectTimeout: 10000, // 10 seconds
    queryTimeout: 30000, // 30 seconds
    // Retry settings
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    // Logging configuration
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
};
/**
 * Initialize Prisma client with proper configuration
 * @returns Promise<PrismaClient> - Configured Prisma client
 */
const initializePrisma = async () => {
    try {
        if (!prisma) {
            console.log('🔧 Initializing Prisma client...');
            prisma = new database_1.PrismaClient({
                log: databaseConfig.log,
                errorFormat: 'pretty',
                // Datasource configuration
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL
                    }
                }
            });
            // Add middleware for query logging in development
            if (process.env.NODE_ENV === 'development') {
                prisma.$use(async (params, next) => {
                    const before = Date.now();
                    const result = await next(params);
                    const after = Date.now();
                    console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
                    return result;
                });
            }
            // Add middleware for error logging
            prisma.$use(async (params, next) => {
                try {
                    return await next(params);
                }
                catch (error) {
                    console.error(`Database error in ${params.model}.${params.action}:`, error);
                    throw error;
                }
            });
            console.log('✅ Prisma client initialized successfully');
        }
        return prisma;
    }
    catch (error) {
        console.error('❌ Failed to initialize Prisma client:', error);
        throw new Error(`Database initialization failed: ${error}`);
    }
};
exports.initializePrisma = initializePrisma;
/**
 * Connect to the database with retry logic
 * @returns Promise<void>
 */
const connectDatabase = async () => {
    let retries = 0;
    while (retries < databaseConfig.maxRetries) {
        try {
            if (!prisma) {
                prisma = await (0, exports.initializePrisma)();
            }
            // Test the connection
            await prisma.$connect();
            // Verify connection with a simple query
            await prisma.$queryRaw `SELECT 1`;
            console.log('✅ Database connection established successfully');
            return;
        }
        catch (error) {
            retries++;
            console.error(`❌ Database connection attempt ${retries} failed:`, error);
            if (retries >= databaseConfig.maxRetries) {
                throw new Error(`Failed to connect to database after ${databaseConfig.maxRetries} attempts`);
            }
            console.log(`⏳ Retrying database connection in ${databaseConfig.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, databaseConfig.retryDelay));
        }
    }
};
exports.connectDatabase = connectDatabase;
/**
 * Disconnect from the database gracefully
 * @returns Promise<void>
 */
const disconnectDatabase = async () => {
    try {
        if (prisma) {
            await prisma.$disconnect();
            console.log('✅ Database disconnected successfully');
        }
    }
    catch (error) {
        console.error('❌ Error disconnecting from database:', error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
/**
 * Check database health
 * @returns Promise<boolean> - True if database is healthy
 */
const checkDatabaseHealth = async () => {
    try {
        if (!prisma) {
            return false;
        }
        // Simple health check query
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('❌ Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
/**
 * Get database connection info
 * @returns Object with connection details
 */
const getDatabaseInfo = async () => {
    try {
        if (!prisma) {
            throw new Error('Database not connected');
        }
        // Get database version and connection info
        const [version] = await prisma.$queryRaw `
      SELECT version() as version
    `;
        const [connectionCount] = await prisma.$queryRaw `
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;
        return {
            version: version.version,
            activeConnections: connectionCount.count,
            isConnected: true,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('❌ Failed to get database info:', error);
        return {
            isConnected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
    }
};
exports.getDatabaseInfo = getDatabaseInfo;
/**
 * Execute database transaction with retry logic
 * @param operation - Function to execute within transaction
 * @returns Promise<T> - Result of the operation
 */
const executeTransaction = async (operation) => {
    if (!prisma) {
        throw new Error('Database not connected');
    }
    let retries = 0;
    while (retries < databaseConfig.maxRetries) {
        try {
            return await prisma.$transaction(operation, {
                timeout: databaseConfig.queryTimeout,
                maxWait: databaseConfig.connectTimeout,
            });
        }
        catch (error) {
            retries++;
            // Check if it's a retryable error
            const isRetryable = error.code === 'P2034' || // Transaction conflict
                error.code === 'P1017' || // Server has closed the connection
                error.message?.includes('connection');
            if (isRetryable && retries < databaseConfig.maxRetries) {
                console.warn(`🔄 Transaction failed, retrying (${retries}/${databaseConfig.maxRetries}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, databaseConfig.retryDelay * retries));
                continue;
            }
            console.error('❌ Transaction failed permanently:', error);
            throw error;
        }
    }
    throw new Error('Transaction failed after maximum retries');
};
exports.executeTransaction = executeTransaction;
/**
 * Get the Prisma client instance
 * @returns PrismaClient - The global Prisma client
 */
const getPrismaClient = () => {
    if (!prisma) {
        // Initialize synchronously if not already done
        prisma = new database_1.PrismaClient({
            log: ['error'],
            errorFormat: 'pretty'
        });
    }
    return prisma;
};
exports.getPrismaClient = getPrismaClient;
/**
 * Database utilities for common operations
 */
exports.dbUtils = {
    /**
     * Check if a record exists
     */
    exists: async (model, where) => {
        try {
            const count = await prisma[model].count({ where });
            return count > 0;
        }
        catch (error) {
            console.error(`❌ Error checking existence in ${model}:`, error);
            return false;
        }
    },
    /**
     * Get record count with optional filters
     */
    count: async (model, where = {}) => {
        try {
            return await prisma[model].count({ where });
        }
        catch (error) {
            console.error(`❌ Error counting records in ${model}:`, error);
            return 0;
        }
    },
    /**
     * Soft delete a record (mark as inactive)
     */
    softDelete: async (model, id) => {
        try {
            await prisma[model].update({
                where: { id },
                data: { isActive: false, updatedAt: new Date() }
            });
            return true;
        }
        catch (error) {
            console.error(`❌ Error soft deleting record in ${model}:`, error);
            return false;
        }
    }
};
// Export shared instance from @nakksha/database
exports.default = database_1.prisma;
/**
 * Testing utilities for database operations
 * Only available in development/test environments
 */
exports.dbTestUtils = process.env.NODE_ENV !== 'production' ? {
    /**
     * Clear all data from database (USE WITH CAUTION!)
     */
    clearDatabase: async () => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clear database in production');
        }
        console.warn('⚠️ Clearing database - this will delete all data!');
        // Delete in correct order to avoid foreign key constraints
        const models = [
            'message', 'conversation', 'emailLog', 'dailyAnalytics',
            'paymentTransaction', 'quotation', 'availabilitySlot',
            'session', 'client', 'consultant', 'admin'
        ];
        for (const model of models) {
            await prisma[model].deleteMany({});
            console.log(`🗑️ Cleared ${model} table`);
        }
    },
    /**
     * Seed database with test data
     */
    seedTestData: async () => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot seed test data in production');
        }
        console.log('🌱 Seeding test data...');
        // Create test consultant
        const testConsultant = await prisma.consultant.create({
            data: {
                email: 'test@consultant.com',
                passwordHash: '$2a$10$example', // This should be properly hashed
                firstName: 'Test',
                lastName: 'Consultant',
                phoneNumber: '9876543210',
                slug: 'test-consultant',
                personalSessionPrice: 1000.00,
                webinarSessionPrice: 500.00,
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log('✅ Test data seeded successfully');
    }
} : {};
//# sourceMappingURL=database.js.map