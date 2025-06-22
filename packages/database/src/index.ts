/**
 * @nakksha/database - Shared Database Package
 * 
 * This package provides:
 * - Prisma client exports
 * - Database utility functions
 * - Shared types and enums
 * - Connection management utilities
 */

// Re-export everything from Prisma client
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';

// Re-export database utilities
export * from './client';
export * from './types';
export * from './utils';

import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

export { prisma };


// Default export for convenience
export { default } from './client';