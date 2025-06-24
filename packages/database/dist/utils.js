"use strict";
// /**
//  * Database Utility Functions
//  * 
//  * Common database operations and helper functions
//  * that can be reused across the application.
//  */
// import { prisma } from './client';
// import type { PaginatedResult, PaginationParams } from './types';
// // ============================================================================
// // PAGINATION UTILITIES
// // ============================================================================
// /**
//  * Apply pagination to a Prisma query
//  */
// export const paginate = <T>(
//   page: number = 1,
//   limit: number = 20
// ): { skip: number; take: number } => {
//   const skip = (page - 1) * limit;
//   return { skip, take: limit };
// };
// /**
//  * Create paginated result object
//  */
// export const createPaginatedResult = <T>(
//   data: T[],
//   total: number,
//   page: number,
//   limit: number
// ): PaginatedResult<T> => {
//   const totalPages = Math.ceil(total / limit);
//   return {
//     data,
//     total,
//     page,
//     limit,
//     totalPages,
//     hasNext: page < totalPages,
//     hasPrev: page > 1,
//   };
// };
// // ============================================================================
// // QUERY BUILDERS
// // ============================================================================
// /**
//  * Build date range filter for Prisma queries
//  */
// export const buildDateRangeFilter = (
//   startDate?: Date,
//   endDate?: Date,
//   field: string = 'createdAt'
// ) => {
//   const filter: any = {};
//   if (startDate || endDate) {
//     filter[field] = {};
//     if (startDate) {
//       filter[field].gte = startDate;
//     }
//     if (endDate) {
//       filter[field].lte = endDate;
//     }
//   }
//   return filter;
// };
// /**
//  * Build search filter for text fields
//  */
// export const buildSearchFilter = (
//   search: string,
//   fields: string[]
// ): any => {
//   if (!search || !fields.length) {
//     return {};
//   }
//   return {
//     OR: fields.map(field => ({
//       [field]: {
//         contains: search,
//         mode: 'insensitive'
//       }
//     }))
//   };
// };
// // ============================================================================
// // TRANSACTION UTILITIES
// // ============================================================================
// /**
//  * Execute multiple operations in a transaction
//  */
// export const executeTransaction = async <T>(
//   operations: (tx: typeof prisma) => Promise<T>
// ): Promise<T> => {
//   return await prisma.$transaction(operations);
// };
// /**
//  * Retry transaction on failure
//  */
// export const retryTransaction = async <T>(
//   operations: (tx: typeof prisma) => Promise<T>,
//   maxRetries: number = 3,
//   delay: number = 1000
// ): Promise<T> => {
//   let lastError: Error;
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       return await prisma.$transaction(operations);
//     } catch (error) {
//       lastError = error as Error;
//       // Only retry on specific errors
//       const retryableErrors = ['P2034', 'P1017', 'ECONNRESET'];
//       const isRetryable = retryableErrors.some(code => 
//         lastError.message.includes(code)
//       );
//       if (!isRetryable || attempt === maxRetries) {
//         throw lastError;
//       }
//       // Wait before retrying
//       await new Promise(resolve => setTimeout(resolve, delay * attempt));
//     }
//   }
//   throw lastError!;
// };
// // ============================================================================
// // VALIDATION UTILITIES
// // ============================================================================
// /**
//  * Check if a record exists by ID
//  */
// export const recordExists = async (
//   model: keyof typeof prisma,
//   id: string
// ): Promise<boolean> => {
//   try {
//     const record = await (prisma[model] as any).findUnique({
//       where: { id },
//       select: { id: true }
//     });
//     return !!record;
//   } catch (error) {
//     return false;
//   }
// };
// /**
//  * Check if email is unique for a model
//  */
// export const isEmailUnique = async (
//   model: keyof typeof prisma,
//   email: string,
//   excludeId?: string
// ): Promise<boolean> => {
//   try {
//     const where: any = { email: email.toLowerCase() };
//     if (excludeId) {
//       where.id = { not: excludeId };
//     }
//     const record = await (prisma[model] as any).findFirst({
//       where,
//       select: { id: true }
//     });
//     return !record;
//   } catch (error) {
//     return false;
//   }
// };
// // ============================================================================
// // ANALYTICS UTILITIES
// // ============================================================================
// /**
//  * Get date range for analytics queries
//  */
// export const getAnalyticsDateRange = (period: string): { startDate: Date; endDate: Date } => {
//   const endDate = new Date();
//   const startDate = new Date();
//   switch (period) {
//     case 'today':
//       startDate.setHours(0, 0, 0, 0);
//       endDate.setHours(23, 59, 59, 999);
//       break;
//     case 'week':
//       startDate.setDate(startDate.getDate() - 7);
//       break;
//     case 'month':
//       startDate.setMonth(startDate.getMonth() - 1);
//       break;
//     case 'quarter':
//       startDate.setMonth(startDate.getMonth() - 3);
//       break;
//     case 'year':
//       startDate.setFullYear(startDate.getFullYear() - 1);
//       break;
//     default:
//       startDate.setDate(startDate.getDate() - 30);
//   }
//   return { startDate, endDate };
// };
// /**
//  * Calculate percentage change
//  */
// export const calculatePercentageChange = (
//   current: number,
//   previous: number
// ): number => {
//   if (previous === 0) {
//     return current > 0 ? 100 : 0;
//   }
//   return ((current - previous) / previous) * 100;
// };
// // ============================================================================
// // CLEANUP UTILITIES
// // ============================================================================
// /**
//  * Clean up expired records
//  */
// export const cleanupExpiredRecords = async (): Promise<void> => {
//   const now = new Date();
//   // Clean up expired refresh tokens
//   await prisma.refreshToken.deleteMany({
//     where: {
//       OR: [
//         { expiresAt: { lte: now } },
//         { isRevoked: true }
//       ]
//     }
//   });
//   // Clean up expired password reset tokens would be here if we stored them in DB
//   // For now, they're in Redis with TTL
// };
// /**
//  * Soft delete record by setting isActive to false
//  */
// export const softDelete = async (
//   model: keyof typeof prisma,
//   id: string
// ): Promise<boolean> => {
//   try {
//     await (prisma[model] as any).update({
//       where: { id },
//       data: { 
//         isActive: false,
//         updatedAt: new Date()
//       }
//     });
//     return true;
//   } catch (error) {
//     return false;
//   }
// };
// // ============================================================================
// // EXPORT ALL UTILITIES
// // ============================================================================
// export const dbUtils = {
//   paginate,
//   createPaginatedResult,
//   buildDateRangeFilter,
//   buildSearchFilter,
//   executeTransaction,
//   retryTransaction,
//   recordExists,
//   isEmailUnique,
//   getAnalyticsDateRange,
//   calculatePercentageChange,
//   cleanupExpiredRecords,
//   softDelete,
// };
// export default dbUtils;
