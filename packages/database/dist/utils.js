"use strict";
/**
 * Database Utility Functions
 *
 * Common database operations and helper functions
 * that can be reused across the application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbUtils = exports.softDelete = exports.cleanupExpiredRecords = exports.calculatePercentageChange = exports.getAnalyticsDateRange = exports.isEmailUnique = exports.recordExists = exports.retryTransaction = exports.executeTransaction = exports.buildSearchFilter = exports.buildDateRangeFilter = exports.createPaginatedResult = exports.paginate = void 0;
const client_1 = require("./client");
// ============================================================================
// PAGINATION UTILITIES
// ============================================================================
/**
 * Apply pagination to a Prisma query
 */
const paginate = (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
};
exports.paginate = paginate;
/**
 * Create paginated result object
 */
const createPaginatedResult = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
};
exports.createPaginatedResult = createPaginatedResult;
// ============================================================================
// QUERY BUILDERS
// ============================================================================
/**
 * Build date range filter for Prisma queries
 */
const buildDateRangeFilter = (startDate, endDate, field = 'createdAt') => {
    const filter = {};
    if (startDate || endDate) {
        filter[field] = {};
        if (startDate) {
            filter[field].gte = startDate;
        }
        if (endDate) {
            filter[field].lte = endDate;
        }
    }
    return filter;
};
exports.buildDateRangeFilter = buildDateRangeFilter;
/**
 * Build search filter for text fields
 */
const buildSearchFilter = (search, fields) => {
    if (!search || !fields.length) {
        return {};
    }
    return {
        OR: fields.map(field => ({
            [field]: {
                contains: search,
                mode: 'insensitive'
            }
        }))
    };
};
exports.buildSearchFilter = buildSearchFilter;
// ============================================================================
// TRANSACTION UTILITIES
// ============================================================================
/**
 * Execute multiple operations in a transaction
 */
const executeTransaction = async (operations) => {
    return await client_1.prisma.$transaction(operations);
};
exports.executeTransaction = executeTransaction;
/**
 * Retry transaction on failure
 */
const retryTransaction = async (operations, maxRetries = 3, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await client_1.prisma.$transaction(operations);
        }
        catch (error) {
            lastError = error;
            // Only retry on specific errors
            const retryableErrors = ['P2034', 'P1017', 'ECONNRESET'];
            const isRetryable = retryableErrors.some(code => lastError.message.includes(code));
            if (!isRetryable || attempt === maxRetries) {
                throw lastError;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    throw lastError;
};
exports.retryTransaction = retryTransaction;
// ============================================================================
// VALIDATION UTILITIES
// ============================================================================
/**
 * Check if a record exists by ID
 */
const recordExists = async (model, id) => {
    try {
        const record = await client_1.prisma[model].findUnique({
            where: { id },
            select: { id: true }
        });
        return !!record;
    }
    catch (error) {
        return false;
    }
};
exports.recordExists = recordExists;
/**
 * Check if email is unique for a model
 */
const isEmailUnique = async (model, email, excludeId) => {
    try {
        const where = { email: email.toLowerCase() };
        if (excludeId) {
            where.id = { not: excludeId };
        }
        const record = await client_1.prisma[model].findFirst({
            where,
            select: { id: true }
        });
        return !record;
    }
    catch (error) {
        return false;
    }
};
exports.isEmailUnique = isEmailUnique;
// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================
/**
 * Get date range for analytics queries
 */
const getAnalyticsDateRange = (period) => {
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        default:
            startDate.setDate(startDate.getDate() - 30);
    }
    return { startDate, endDate };
};
exports.getAnalyticsDateRange = getAnalyticsDateRange;
/**
 * Calculate percentage change
 */
const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
};
exports.calculatePercentageChange = calculatePercentageChange;
// ============================================================================
// CLEANUP UTILITIES
// ============================================================================
/**
 * Clean up expired records
 */
const cleanupExpiredRecords = async () => {
    const now = new Date();
    // Clean up expired refresh tokens
    await client_1.prisma.refreshToken.deleteMany({
        where: {
            OR: [
                { expiresAt: { lte: now } },
                { isRevoked: true }
            ]
        }
    });
    // Clean up expired password reset tokens would be here if we stored them in DB
    // For now, they're in Redis with TTL
};
exports.cleanupExpiredRecords = cleanupExpiredRecords;
/**
 * Soft delete record by setting isActive to false
 */
const softDelete = async (model, id) => {
    try {
        await client_1.prisma[model].update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date()
            }
        });
        return true;
    }
    catch (error) {
        return false;
    }
};
exports.softDelete = softDelete;
// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================
exports.dbUtils = {
    paginate: exports.paginate,
    createPaginatedResult: exports.createPaginatedResult,
    buildDateRangeFilter: exports.buildDateRangeFilter,
    buildSearchFilter: exports.buildSearchFilter,
    executeTransaction: exports.executeTransaction,
    retryTransaction: exports.retryTransaction,
    recordExists: exports.recordExists,
    isEmailUnique: exports.isEmailUnique,
    getAnalyticsDateRange: exports.getAnalyticsDateRange,
    calculatePercentageChange: exports.calculatePercentageChange,
    cleanupExpiredRecords: exports.cleanupExpiredRecords,
    softDelete: exports.softDelete,
};
exports.default = exports.dbUtils;
