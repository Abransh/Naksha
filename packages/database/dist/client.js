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
 * Validate required environment variables
 */
const validateEnvironment = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('❌ DATABASE_URL environment variable is required but not found.\n' +
            'Please ensure your .env file contains:\n' +
            'DATABASE_URL="your-database-connection-string"\n' +
            '\nFor DigitalOcean deployment, make sure to set environment variables in your app settings.');
    }
};
/**
 * Create Prisma client with optimal configuration
 */
const createPrismaClient = () => {
    // Validate environment first
    validateEnvironment();
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
