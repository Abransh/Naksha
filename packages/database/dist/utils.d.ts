/**
 * Database Utility Functions
 *
 * Common database operations and helper functions
 * that can be reused across the application.
 */
import { prisma } from './client';
import type { PaginatedResult } from './types';
/**
 * Apply pagination to a Prisma query
 */
export declare const paginate: <T>(page?: number, limit?: number) => {
    skip: number;
    take: number;
};
/**
 * Create paginated result object
 */
export declare const createPaginatedResult: <T>(data: T[], total: number, page: number, limit: number) => PaginatedResult<T>;
/**
 * Build date range filter for Prisma queries
 */
export declare const buildDateRangeFilter: (startDate?: Date, endDate?: Date, field?: string) => any;
/**
 * Build search filter for text fields
 */
export declare const buildSearchFilter: (search: string, fields: string[]) => any;
/**
 * Execute multiple operations in a transaction
 */
export declare const executeTransaction: <T>(operations: (tx: typeof prisma) => Promise<T>) => Promise<T>;
/**
 * Retry transaction on failure
 */
export declare const retryTransaction: <T>(operations: (tx: typeof prisma) => Promise<T>, maxRetries?: number, delay?: number) => Promise<T>;
/**
 * Check if a record exists by ID
 */
export declare const recordExists: (model: keyof typeof prisma, id: string) => Promise<boolean>;
/**
 * Check if email is unique for a model
 */
export declare const isEmailUnique: (model: keyof typeof prisma, email: string, excludeId?: string) => Promise<boolean>;
/**
 * Get date range for analytics queries
 */
export declare const getAnalyticsDateRange: (period: string) => {
    startDate: Date;
    endDate: Date;
};
/**
 * Calculate percentage change
 */
export declare const calculatePercentageChange: (current: number, previous: number) => number;
/**
 * Clean up expired records
 */
export declare const cleanupExpiredRecords: () => Promise<void>;
/**
 * Soft delete record by setting isActive to false
 */
export declare const softDelete: (model: keyof typeof prisma, id: string) => Promise<boolean>;
export declare const dbUtils: {
    paginate: <T>(page?: number, limit?: number) => {
        skip: number;
        take: number;
    };
    createPaginatedResult: <T>(data: T[], total: number, page: number, limit: number) => PaginatedResult<T>;
    buildDateRangeFilter: (startDate?: Date, endDate?: Date, field?: string) => any;
    buildSearchFilter: (search: string, fields: string[]) => any;
    executeTransaction: <T>(operations: (tx: typeof prisma) => Promise<T>) => Promise<T>;
    retryTransaction: <T>(operations: (tx: typeof prisma) => Promise<T>, maxRetries?: number, delay?: number) => Promise<T>;
    recordExists: (model: keyof typeof prisma, id: string) => Promise<boolean>;
    isEmailUnique: (model: keyof typeof prisma, email: string, excludeId?: string) => Promise<boolean>;
    getAnalyticsDateRange: (period: string) => {
        startDate: Date;
        endDate: Date;
    };
    calculatePercentageChange: (current: number, previous: number) => number;
    cleanupExpiredRecords: () => Promise<void>;
    softDelete: (model: keyof typeof prisma, id: string) => Promise<boolean>;
};
export default dbUtils;
//# sourceMappingURL=utils.d.ts.map