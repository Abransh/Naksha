/**
 * Redis Configuration and Connection Manager
 *
 * This module handles:
 * - Redis client initialization
 * - Connection management with retry logic
 * - Caching utilities
 * - Session management
 * - Queue management for background jobs
 * - Real-time data caching
 */
import { RedisClientType } from 'redis';
/**
 * Global Redis client instance
 */
declare let redisClient: RedisClientType;
/**
 * Redis configuration
 */
declare const redisConfig: {
    url: string | undefined;
    socket: {
        family?: number | undefined;
        noDelay?: boolean | undefined;
        keepAliveInitialDelay?: number | undefined;
        tls?: {} | undefined;
        connectTimeout: number;
        lazyConnect: boolean;
        reconnectStrategy: (retries: number) => number | false;
    };
    maxRetries: number;
    retryDelay: number;
    prefixes: {
        session: string;
        cache: string;
        queue: string;
        lock: string;
        rate_limit: string;
        real_time: string;
        analytics: string;
    };
    ttl: {
        session: number;
        shortCache: number;
        mediumCache: number;
        longCache: number;
        analytics: number;
    };
};
/**
 * Initialize Redis client with proper configuration
 * @returns Promise<RedisClientType> - Configured Redis client
 */
export declare const initializeRedis: () => Promise<RedisClientType>;
/**
 * Connect to Redis with enhanced retry logic for production
 * @returns Promise<void>
 */
export declare const connectRedis: () => Promise<void>;
/**
 * Disconnect from Redis gracefully
 * @returns Promise<void>
 */
export declare const disconnectRedis: () => Promise<void>;
/**
 * Check Redis health
 * @returns Promise<boolean> - True if Redis is healthy
 */
export declare const checkRedisHealth: () => Promise<boolean>;
/**
 * Get Redis connection info
 * @returns Object with connection details
 */
export declare const getRedisInfo: () => Promise<{
    isConnected: boolean;
    serverInfo: string;
    connectedClients: number;
    timestamp: string;
    error?: undefined;
} | {
    isConnected: boolean;
    error: string;
    timestamp: string;
    serverInfo?: undefined;
    connectedClients?: undefined;
}>;
/**
 * Get the Redis client instance
 * @returns RedisClientType | null - The global Redis client or null if not available
 */
export declare const getRedisClient: () => RedisClientType | null;
/**
 * Redis cache utilities
 */
export declare const cacheUtils: {
    /**
     * Set a cache value with TTL
     */
    set: (key: string, value: any, ttlSeconds?: number) => Promise<boolean>;
    /**
     * Get a cache value
     */
    get: <T = any>(key: string) => Promise<T | null>;
    /**
     * Delete a cache key
     */
    delete: (key: string) => Promise<boolean>;
    /**
     * Check if a cache key exists
     */
    exists: (key: string) => Promise<boolean>;
    /**
     * Set cache with auto-expiry based on type
     */
    setWithAutoTTL: (key: string, value: any, type: keyof typeof redisConfig.ttl) => Promise<boolean>;
    /**
     * Clear all cache keys with a pattern
     */
    clearPattern: (pattern: string) => Promise<number>;
};
/**
 * Session management utilities
 */
export declare const sessionUtils: {
    /**
     * Store user session
     */
    setSession: (sessionId: string, sessionData: any) => Promise<boolean>;
    /**
     * Get user session
     */
    getSession: <T = any>(sessionId: string) => Promise<T | null>;
    /**
     * Delete user session
     */
    deleteSession: (sessionId: string) => Promise<boolean>;
    /**
     * Extend session TTL
     */
    extendSession: (sessionId: string) => Promise<boolean>;
};
/**
 * Rate limiting utilities
 */
export declare const rateLimitUtils: {
    /**
     * Check and increment rate limit counter
     */
    checkRateLimit: (identifier: string, maxRequests: number, windowSeconds: number) => Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
};
/**
 * Real-time data utilities for Socket.IO
 */
export declare const realTimeUtils: {
    /**
     * Store user socket mapping
     */
    setUserSocket: (userId: string, socketId: string) => Promise<boolean>;
    /**
     * Get user socket ID
     */
    getUserSocket: (userId: string) => Promise<string | null>;
    /**
     * Remove user socket mapping
     */
    removeUserSocket: (userId: string) => Promise<boolean>;
};
/**
 * Cache Manager - high-level cache interface
 */
export declare const CacheManager: {
    set: (key: string, value: any, ttlSeconds?: number) => Promise<boolean>;
    get: <T = any>(key: string) => Promise<T | null>;
    del: (key: string) => Promise<boolean>;
    exists: (key: string) => Promise<boolean>;
    setWithAutoTTL: (key: string, value: any, type: keyof typeof redisConfig.ttl) => Promise<boolean>;
    clearPattern: (pattern: string) => Promise<number>;
};
export { redisClient };
/**
 * Testing utilities for Redis operations
 * Only available in development/test environments
 */
export declare const redisTestUtils: {
    /**
     * Clear all Redis data (USE WITH CAUTION!)
     */
    clearAllData: () => Promise<void>;
    /**
     * Get all keys with pattern
     */
    getAllKeys: (pattern?: string) => Promise<string[]>;
} | {
    /**
     * Clear all Redis data (USE WITH CAUTION!)
     */
    clearAllData?: undefined;
    /**
     * Get all keys with pattern
     */
    getAllKeys?: undefined;
};
//# sourceMappingURL=redis.d.ts.map