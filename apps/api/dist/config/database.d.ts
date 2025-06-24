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
import { PrismaClient } from '@prisma/client';
/**
 * Initialize Prisma client with proper configuration
 * @returns Promise<PrismaClient> - Configured Prisma client
 */
export declare const initializePrisma: () => Promise<PrismaClient>;
/**
 * Connect to the database with retry logic
 * @returns Promise<void>
 */
export declare const connectDatabase: () => Promise<void>;
/**
 * Disconnect from the database gracefully
 * @returns Promise<void>
 */
export declare const disconnectDatabase: () => Promise<void>;
/**
 * Check database health
 * @returns Promise<boolean> - True if database is healthy
 */
export declare const checkDatabaseHealth: () => Promise<boolean>;
/**
 * Get database connection info
 * @returns Object with connection details
 */
export declare const getDatabaseInfo: () => Promise<{
    version: any;
    activeConnections: any;
    isConnected: boolean;
    timestamp: string;
    error?: undefined;
} | {
    isConnected: boolean;
    error: string;
    timestamp: string;
    version?: undefined;
    activeConnections?: undefined;
}>;
/**
 * Execute database transaction with retry logic
 * @param operation - Function to execute within transaction
 * @returns Promise<T> - Result of the operation
 */
export declare const executeTransaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
/**
 * Get the Prisma client instance
 * @returns PrismaClient - The global Prisma client
 */
export declare const getPrismaClient: () => PrismaClient;
/**
 * Database utilities for common operations
 */
export declare const dbUtils: {
    /**
     * Check if a record exists
     */
    exists: (model: string, where: any) => Promise<boolean>;
    /**
     * Get record count with optional filters
     */
    count: (model: string, where?: any) => Promise<number>;
    /**
     * Soft delete a record (mark as inactive)
     */
    softDelete: (model: string, id: string) => Promise<boolean>;
};
declare let defaultPrisma: PrismaClient;
export default defaultPrisma;
/**
 * Testing utilities for database operations
 * Only available in development/test environments
 */
export declare const dbTestUtils: {
    /**
     * Clear all data from database (USE WITH CAUTION!)
     */
    clearDatabase: () => Promise<void>;
    /**
     * Seed database with test data
     */
    seedTestData: () => Promise<void>;
} | {
    /**
     * Clear all data from database (USE WITH CAUTION!)
     */
    clearDatabase?: undefined;
    /**
     * Seed database with test data
     */
    seedTestData?: undefined;
};
//# sourceMappingURL=database.d.ts.map