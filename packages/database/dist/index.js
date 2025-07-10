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
// Remove the problematic Prisma client instantiation from here
// The client should be imported from ./client.ts which has proper validation
// Default export for convenience
var client_2 = require("./client");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(client_2).default; } });
