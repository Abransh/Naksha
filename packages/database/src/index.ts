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
// export * from './utils';

// Remove the problematic Prisma client instantiation from here
// The client should be imported from ./client.ts which has proper validation


// Default export for convenience
export { default } from './client';