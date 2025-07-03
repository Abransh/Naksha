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
    url: process.env.REDIS_URL,
    // Socket configuration
    socket: {
        connectTimeout: 30000, // Increased to 30 seconds for DigitalOcean
        lazyConnect: false, // Disabled for production stability
        reconnectStrategy: (retries) => {
            if (retries > 10) { // Increased max retries for production
                console.error('❌ Redis max retries exceeded');
                return false;
            }
            const delay = Math.min(retries * 2000, 10000); // Exponential backoff up to 10 seconds
            console.log(`🔄 Redis reconnecting in ${delay}ms... (attempt ${retries + 1})`);
            return delay;
        },
        // Enhanced TLS support for DigitalOcean Redis
        ...(process.env.REDIS_URL?.startsWith('rediss://') ? {
            tls: {}
        } : {}),
        // Production-specific socket options
        ...(process.env.NODE_ENV === 'production' && {
            family: 4, // Force IPv4
            noDelay: true,
            keepAliveInitialDelay: 0
        })
    },
    // Enhanced retry settings for production
    maxRetries: 10, // Increased for production
    retryDelay: 2000, // 2 seconds
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
            // Create Redis client with enhanced error handling for production
            const clientConfig = {
                url: redisConfig.url,
                socket: {
                    connectTimeout: redisConfig.socket.connectTimeout,
                    lazyConnect: redisConfig.socket.lazyConnect,
                    reconnectStrategy: redisConfig.socket.reconnectStrategy,
                    ...(redisConfig.url?.startsWith('rediss://') && {
                        tls: {}
                    }),
                    ...(process.env.NODE_ENV === 'production' && {
                        family: 4,
                        noDelay: true,
                        keepAliveInitialDelay: 0
                    })
                },
                // Add additional production-friendly options
                pingInterval: 30000, // Ping every 30 seconds to keep connection alive
                ...(process.env.NODE_ENV === 'production' && {
                    retryDelayOnFailover: 100,
                    enableReadyCheck: false,
                    maxRetriesPerRequest: 3
                })
            };
            exports.redisClient = redisClient = (0, redis_1.createClient)(clientConfig);
            // Enhanced error handling for production
            redisClient.on('error', (error) => {
                console.error('❌ Redis client error:', error);
                console.log('⚠️ Redis error handled, continuing...');
                // Log error details in production for debugging
                if (process.env.NODE_ENV === 'production') {
                    console.error('Redis Error Details:', {
                        message: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString(),
                        url: redisConfig.url?.substring(0, 20) + '...' // Mask sensitive data
                    });
                }
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
            // Production-specific event handlers
            if (process.env.NODE_ENV === 'production') {
                redisClient.on('close', () => {
                    console.warn('⚠️ Redis connection closed unexpectedly in production');
                });
                redisClient.on('lazyConnect', () => {
                    console.log('🔌 Redis lazy connection established');
                });
            }
            console.log('✅ Redis client initialized successfully');
        }
        return redisClient;
    }
    catch (error) {
        console.error('❌ Failed to initialize Redis client:', error);
        // In production, don't crash the app - Redis is optional for basic functionality
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️ Redis initialization failed in production, continuing without cache...');
            return null; // Return null to indicate Redis is not available
        }
        throw new Error(`Redis initialization failed: ${error}`);
    }
};
exports.initializeRedis = initializeRedis;
/**
 * Connect to Redis with enhanced retry logic for production
 * @returns Promise<void>
 */
const connectRedis = async () => {
    let retries = 0;
    // Check if Redis URL is available
    if (!process.env.REDIS_URL) {
        console.warn('⚠️ REDIS_URL not configured, skipping Redis connection');
        return;
    }
    while (retries < redisConfig.maxRetries) {
        try {
            if (!redisClient) {
                exports.redisClient = redisClient = await (0, exports.initializeRedis)();
                if (!redisClient) {
                    console.warn('⚠️ Redis client initialization returned null, skipping connection');
                    return;
                }
            }
            // Skip connection if already connected
            if (redisClient.isOpen) {
                console.log('✅ Redis already connected');
                return;
            }
            // Connect to Redis with timeout
            console.log(`🔌 Attempting Redis connection (attempt ${retries + 1}/${redisConfig.maxRetries})...`);
            const connectionPromise = redisClient.connect();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), 30000);
            });
            await Promise.race([connectionPromise, timeoutPromise]);
            // Test the connection with a simple ping
            const pingResult = await redisClient.ping();
            if (pingResult !== 'PONG') {
                throw new Error('Redis ping failed');
            }
            console.log('✅ Redis connection established successfully');
            return;
        }
        catch (error) {
            retries++;
            console.error(`❌ Redis connection attempt ${retries} failed:`, error);
            // Clean up failed connection
            if (redisClient && !redisClient.isOpen) {
                try {
                    await redisClient.disconnect();
                }
                catch (disconnectError) {
                    // Ignore disconnect errors
                }
                exports.redisClient = redisClient = null;
            }
            if (retries >= redisConfig.maxRetries) {
                if (process.env.NODE_ENV === 'production') {
                    console.error(`❌ Failed to connect to Redis after ${redisConfig.maxRetries} attempts in production`);
                    console.warn('⚠️ Continuing without Redis - some features will be disabled');
                    return; // Don't crash in production
                }
                else {
                    throw new Error(`Failed to connect to Redis after ${redisConfig.maxRetries} attempts`);
                }
            }
            const delayMs = Math.min(retries * redisConfig.retryDelay, 10000);
            console.log(`⏳ Retrying Redis connection in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
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
 * @returns RedisClientType | null - The global Redis client or null if not available
 */
const getRedisClient = () => {
    if (!redisClient || !redisClient.isOpen) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️ Redis not available in production, returning null');
            return null;
        }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, skipping cache set for key: ${key}`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, cache miss for key: ${key}`);
                return null;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, skipping cache delete for key: ${key}`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, cache exists check for key: ${key} returns false`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, skipping cache pattern clear: ${pattern}`);
                return 0;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, session storage disabled for: ${sessionId}`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, session lookup disabled for: ${sessionId}`);
                return null;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, session deletion disabled for: ${sessionId}`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, session extension disabled for: ${sessionId}`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, rate limiting disabled - allowing request for: ${identifier}`);
                // Fail open - allow request if Redis is down
                return { allowed: true, remaining: maxRequests, resetTime: Date.now() + (windowSeconds * 1000) };
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, socket mapping disabled for user: ${userId}`);
                return false;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, socket lookup disabled for user: ${userId}`);
                return null;
            }
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
            if (!client) {
                console.warn(`⚠️ Redis not available, socket removal disabled for user: ${userId}`);
                return false;
            }
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
        if (!client) {
            throw new Error('Redis client not available');
        }
        await client.flushAll();
        console.log('🗑️ All Redis data cleared');
    },
    /**
     * Get all keys with pattern
     */
    getAllKeys: async (pattern = '*') => {
        try {
            const client = (0, exports.getRedisClient)();
            if (!client) {
                throw new Error('Redis client not available');
            }
            return await client.keys(pattern);
        }
        catch (error) {
            console.error('❌ Error getting Redis keys:', error);
            return [];
        }
    }
} : {};
//# sourceMappingURL=redis.js.map