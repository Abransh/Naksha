/**
 * @nakksha/database - Shared Database Package
 *
 * This package provides:
 * - Prisma client exports
 * - Database utility functions
 * - Shared types and enums
 * - Connection management utilities
 */
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
export * from './client';
export * from './types';
import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<{
    log: ("query" | "warn" | "error")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { prisma };
export { default } from './client';
//# sourceMappingURL=index.d.ts.map