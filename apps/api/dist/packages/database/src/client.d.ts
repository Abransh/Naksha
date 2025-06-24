/**
 * Shared Prisma Client Instance
 *
 * This module provides a singleton Prisma client that can be used
 * across the entire application to ensure consistent database connections.
 */
import { PrismaClient } from '@prisma/client';
declare global {
    var __prisma: PrismaClient | undefined;
}
/**
 * Singleton Prisma client instance
 * In development, store on global to prevent multiple instances during hot reloads
 */
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default prisma;
export { prisma };
//# sourceMappingURL=client.d.ts.map