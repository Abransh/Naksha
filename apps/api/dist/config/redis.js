"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisTestUtils = exports.redisClient = exports.CacheManager = exports.realTimeUtils = exports.rateLimitUtils = exports.sessionUtils = exports.cacheUtils = exports.getRedisClient = exports.getRedisInfo = exports.checkRedisHealth = exports.disconnectRedis = exports.connectRedis = exports.initializeRedis = void 0;
const redis_1 = require("redis");
/**
 * Global Redis client instance
 */
let redisClient;
/**
 * Redis configuration
 */
const redisConfig = {
    // Connection settings
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    // Connection timeout settings
    connectTimeout: 10000, // 10 seconds
    commandTimeout: 5000, // 5 seconds
    // Retry settings
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    // Connection pool settings
    lazyConnect: true,
    // Key prefixes for different data types
    prefixes: {
        session: 'session:',
        cache: 'cache:',
        queue: 'queue:',
        lock: 'lock:',
        rate_limit: 'rate:',
        real_time: 'rt:',
        analytics: 'analytics:',
    },
    // Cache TTL settings (in seconds)
    ttl: {
        session: 7 * 24 * 60 * 60, // 7 days
        shortCache: 5 * 60, // 5 minutes
        mediumCache: 30 * 60, // 30 minutes
        longCache: 24 * 60 * 60, // 24 hours
        analytics: 60 * 60, // 1 hour
    }
};
/**
 * Initialize Redis client with proper configuration
 * @returns Promise<RedisClientType> - Configured Redis client
 */
const initializeRedis = async () => {
    try {
        if (!redisClient) {
            console.log('🔧 Initializing Redis client...');
            exports.redisClient = redisClient = (0, redis_1.createClient)({
                url: redisConfig.url,
                // Connection options
                socket: {
                    connectTimeout: redisConfig.connectTimeout,
                    reconnectStrategy: (retries) => {
                        if (retries >= redisConfig.maxRetries) {
                            console.error('❌ Redis max retries reached');
                            return false;
                        }
                        const delay = Math.min(retries * redisConfig.retryDelay, 3000);
                        console.log(`🔄 Redis reconnecting in ${delay}ms... (attempt ${retries + 1})`);
                        return delay;
                    }
                },
                // Disable offline queue to fail fast
                disableOfflineQueue: false,
            });
            // Error handling
            redisClient.on('error', (error) => {
                console.error('❌ Redis client error:', error);
            });
            redisClient.on('connect', () => {
                console.log('🔗 Redis client connected');
            });
            redisClient.on('ready', () => {
                console.log('✅ Redis client ready');
            });
            redisClient.on('reconnecting', () => {
                console.log('🔄 Redis client reconnecting...');
            });
            redisClient.on('end', () => {
                console.log('🔚 Redis client connection ended');
            });
            console.log('✅ Redis client initialized successfully');
        }
        return redisClient;
    }
    catch (error) {
        console.error('❌ Failed to initialize Redis client:', error);
        throw new Error(`Redis initialization failed: ${error}`);
    }
};
exports.initializeRedis = initializeRedis;
/**
 * Connect to Redis with retry logic
 * @returns Promise<void>
 */
const connectRedis = async () => {
    let retries = 0;
    while (retries < redisConfig.maxRetries) {
        try {
            if (!redisClient) {
                exports.redisClient = redisClient = await (0, exports.initializeRedis)();
            }
            // Connect to Redis
            await redisClient.connect();
            // Test the connection
            await redisClient.ping();
            console.log('✅ Redis connection established successfully');
            return;
        }
        catch (error) {
            retries++;
            console.error(`❌ Redis connection attempt ${retries} failed:`, error);
            if (retries >= redisConfig.maxRetries) {
                throw new Error(`Failed to connect to Redis after ${redisConfig.maxRetries} attempts`);
            }
            console.log(`⏳ Retrying Redis connection in ${redisConfig.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, redisConfig.retryDelay));
        }
    }
};
exports.connectRedis = connectRedis;
/**
 * Disconnect from Redis gracefully
 * @returns Promise<void>
 */
const disconnectRedis = async () => {
    try {
        if (redisClient && redisClient.isOpen) {
            await redisClient.quit();
            console.log('✅ Redis disconnected successfully');
        }
    }
    catch (error) {
        console.error('❌ Error disconnecting from Redis:', error);
        throw error;
    }
};
exports.disconnectRedis = disconnectRedis;
/**
 * Check Redis health
 * @returns Promise<boolean> - True if Redis is healthy
 */
const checkRedisHealth = async () => {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return false;
        }
        const pong = await redisClient.ping();
        return pong === 'PONG';
    }
    catch (error) {
        console.error('❌ Redis health check failed:', error);
        return false;
    }
};
exports.checkRedisHealth = checkRedisHealth;
/**
 * Get Redis connection info
 * @returns Object with connection details
 */
const getRedisInfo = async () => {
    try {
        if (!redisClient || !redisClient.isOpen) {
            throw new Error('Redis not connected');
        }
        const info = await redisClient.info();
        const clientList = await redisClient.clientList();
        return {
            isConnected: true,
            serverInfo: info,
            connectedClients: clientList.length,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('❌ Failed to get Redis info:', error);
        return {
            isConnected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
    }
};
exports.getRedisInfo = getRedisInfo;
/**
 * Get the Redis client instance
 * @returns RedisClientType - The global Redis client
 */
const getRedisClient = () => {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis not connected. Call connectRedis() first.');
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
/**
 * Redis cache utilities
 */
exports.cacheUtils = {
    /**
     * Set a cache value with TTL
     */
    set: async (key, value, ttlSeconds) => {
        try {
            const client = (0, exports.getRedisClient)();
            const serializedValue = JSON.stringify(value);
            if (ttlSeconds) {
                await client.setEx(`${redisConfig.prefixes.cache}${key}`, ttlSeconds, serializedValue);
            }
            else {
                await client.set(`${redisConfig.prefixes.cache}${key}`, serializedValue);
            }
            return true;
        }
        catch (error) {
            console.error(`❌ Error setting cache key ${key}:`, error);
            return false;
        }
    },
    /**
     * Get a cache value
     */
    get: async (key) => {
        try {
            const client = (0, exports.getRedisClient)();
            const value = await client.get(`${redisConfig.prefixes.cache}${key}`);
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            console.error(`❌ Error getting cache key ${key}:`, error);
            return null;
        }
    },
    /**
     * Delete a cache key
     */
    delete: async (key) => {
        try {
            const client = (0, exports.getRedisClient)();
            const result = await client.del(`${redisConfig.prefixes.cache}${key}`);
            return result > 0;
        }
        catch (error) {
            console.error(`❌ Error deleting cache key ${key}:`, error);
            return false;
        }
    },
    /**
     * Check if a cache key exists
     */
    exists: async (key) => {
        try {
            const client = (0, exports.getRedisClient)();
            const result = await client.exists(`${redisConfig.prefixes.cache}${key}`);
            return result > 0;
        }
        catch (error) {
            console.error(`❌ Error checking cache key ${key}:`, error);
            return false;
        }
    },
    /**
     * Set cache with auto-expiry based on type
     */
    setWithAutoTTL: async (key, value, type) => {
        return exports.cacheUtils.set(key, value, redisConfig.ttl[type]);
    },
    /**
     * Clear all cache keys with a pattern
     */
    clearPattern: async (pattern) => {
        try {
            const client = (0, exports.getRedisClient)();
            const keys = await client.keys(`${redisConfig.prefixes.cache}${pattern}`);
            if (keys.length === 0)
                return 0;
            const result = await client.del(keys);
            return result;
        }
        catch (error) {
            console.error(`❌ Error clearing cache pattern ${pattern}:`, error);
            return 0;
        }
    }
};
/**
 * Session management utilities
 */
exports.sessionUtils = {
    /**
     * Store user session
     */
    setSession: async (sessionId, sessionData) => {
        try {
            const client = (0, exports.getRedisClient)();
            const serializedData = JSON.stringify(sessionData);
            await client.setEx(`${redisConfig.prefixes.session}${sessionId}`, redisConfig.ttl.session, serializedData);
            return true;
        }
        catch (error) {
            console.error(`❌ Error setting session ${sessionId}:`, error);
            return false;
        }
    },
    /**
     * Get user session
     */
    getSession: async (sessionId) => {
        try {
            const client = (0, exports.getRedisClient)();
            const sessionData = await client.get(`${redisConfig.prefixes.session}${sessionId}`);
            if (!sessionData)
                return null;
            return JSON.parse(sessionData);
        }
        catch (error) {
            console.error(`❌ Error getting session ${sessionId}:`, error);
            return null;
        }
    },
    /**
     * Delete user session
     */
    deleteSession: async (sessionId) => {
        try {
            const client = (0, exports.getRedisClient)();
            const result = await client.del(`${redisConfig.prefixes.session}${sessionId}`);
            return result > 0;
        }
        catch (error) {
            console.error(`❌ Error deleting session ${sessionId}:`, error);
            return false;
        }
    },
    /**
     * Extend session TTL
     */
    extendSession: async (sessionId) => {
        try {
            const client = (0, exports.getRedisClient)();
            const result = await client.expire(`${redisConfig.prefixes.session}${sessionId}`, redisConfig.ttl.session);
            return result;
        }
        catch (error) {
            console.error(`❌ Error extending session ${sessionId}:`, error);
            return false;
        }
    }
};
/**
 * Rate limiting utilities
 */
exports.rateLimitUtils = {
    /**
     * Check and increment rate limit counter
     */
    checkRateLimit: async (identifier, maxRequests, windowSeconds) => {
        try {
            const client = (0, exports.getRedisClient)();
            const key = `${redisConfig.prefixes.rate_limit}${identifier}`;
            const current = await client.incr(key);
            if (current === 1) {
                await client.expire(key, windowSeconds);
            }
            const ttl = await client.ttl(key);
            const resetTime = Date.now() + (ttl * 1000);
            return {
                allowed: current <= maxRequests,
                remaining: Math.max(0, maxRequests - current),
                resetTime
            };
        }
        catch (error) {
            console.error(`❌ Error checking rate limit for ${identifier}:`, error);
            // Fail open - allow request if Redis is down
            return { allowed: true, remaining: 0, resetTime: 0 };
        }
    }
};
/**
 * Real-time data utilities for Socket.IO
 */
exports.realTimeUtils = {
    /**
     * Store user socket mapping
     */
    setUserSocket: async (userId, socketId) => {
        try {
            const client = (0, exports.getRedisClient)();
            await client.set(`${redisConfig.prefixes.real_time}user:${userId}`, socketId);
            return true;
        }
        catch (error) {
            console.error(`❌ Error setting user socket ${userId}:`, error);
            return false;
        }
    },
    /**
     * Get user socket ID
     */
    getUserSocket: async (userId) => {
        try {
            const client = (0, exports.getRedisClient)();
            return await client.get(`${redisConfig.prefixes.real_time}user:${userId}`);
        }
        catch (error) {
            console.error(`❌ Error getting user socket ${userId}:`, error);
            return null;
        }
    },
    /**
     * Remove user socket mapping
     */
    removeUserSocket: async (userId) => {
        try {
            const client = (0, exports.getRedisClient)();
            const result = await client.del(`${redisConfig.prefixes.real_time}user:${userId}`);
            return result > 0;
        }
        catch (error) {
            console.error(`❌ Error removing user socket ${userId}:`, error);
            return false;
        }
    }
};
// Export default instance
/**
 * Cache Manager - high-level cache interface
 */
exports.CacheManager = {
    set: exports.cacheUtils.set,
    get: exports.cacheUtils.get,
    del: exports.cacheUtils.delete,
    exists: exports.cacheUtils.exists,
    setWithAutoTTL: exports.cacheUtils.setWithAutoTTL,
    clearPattern: exports.cacheUtils.clearPattern
};
/**
 * Testing utilities for Redis operations
 * Only available in development/test environments
 */
exports.redisTestUtils = process.env.NODE_ENV !== 'production' ? {
    /**
     * Clear all Redis data (USE WITH CAUTION!)
     */
    clearAllData: async () => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clear Redis data in production');
        }
        console.warn('⚠️ Clearing all Redis data!');
        const client = (0, exports.getRedisClient)();
        await client.flushAll();
        console.log('🗑️ All Redis data cleared');
    },
    /**
     * Get all keys with pattern
     */
    getAllKeys: async (pattern = '*') => {
        try {
            const client = (0, exports.getRedisClient)();
            return await client.keys(pattern);
        }
        catch (error) {
            console.error('❌ Error getting Redis keys:', error);
            return [];
        }
    }
} : {};
//# sourceMappingURL=redis.js.map