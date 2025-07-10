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
 * Validate required environment variables
 */
const validateEnvironment = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      '❌ DATABASE_URL environment variable is required but not found.\n' +
      'Please ensure your .env file contains:\n' +
      'DATABASE_URL="your-database-connection-string"\n' +
      '\nFor DigitalOcean deployment, make sure to set environment variables in your app settings.'
    );
  }
};

/**
 * Create Prisma client with optimal configuration
 */
const createPrismaClient = () => {
  // Validate environment first
  validateEnvironment();
  
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