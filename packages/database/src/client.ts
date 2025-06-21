/**
 * Shared Prisma Client Instance
 * 
 * This module provides a singleton Prisma client that can be used
 * across the entire application to ensure consistent database connections.
 */

import { PrismaClient } from '@prisma/client';

// Global Prisma client instance
declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var __prisma: PrismaClient | undefined;
}

/**
 * Create Prisma client with optimal configuration
 */
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    errorFormat: 'pretty',
  });
};

/**
 * Singleton Prisma client instance
 * In development, store on global to prevent multiple instances during hot reloads
 */
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export default prisma;
export { prisma };