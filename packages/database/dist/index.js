"use strict";
/**
 * @nakksha/database - Shared Database Package
 *
 * This package provides:
 * - Prisma client exports
 * - Database utility functions
 * - Shared types and enums
 * - Connection management utilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.PrismaClient = void 0;
// Re-export everything from Prisma client
__exportStar(require("@prisma/client"), exports);
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
// Re-export database utilities
__exportStar(require("./client"), exports);
__exportStar(require("./types"), exports);
// export * from './utils';
const client_2 = require("@prisma/client");
const extension_optimize_1 = require("@prisma/extension-optimize");
const prisma = new client_2.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}).$extends((0, extension_optimize_1.withOptimize)({ apiKey: process.env.OPTIMIZE_API_KEY || 'default-api-key' }));
// Default export for convenience
var client_3 = require("./client");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(client_3).default; } });
