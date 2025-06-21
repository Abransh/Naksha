"use strict";
/**
 * Shared Prisma Client Instance
 *
 * This module provides a singleton Prisma client that can be used
 * across the entire application to ensure consistent database connections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
/**
 * Create Prisma client with optimal configuration
 */
const createPrismaClient = () => {
    return new client_1.PrismaClient({
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
exports.prisma = prisma;
if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = prisma;
}
exports.default = prisma;
