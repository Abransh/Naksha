"use strict";
// apps/api/src/utils/logger.ts
// Nakksha Consulting Platform - Logging Utility
// Comprehensive logging system with different levels and structured output
// Supports development debugging and production monitoring
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLogger = exports.loggerUtils = exports.createChildLogger = exports.logError = exports.requestLogger = exports.logger = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Log levels enum
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger configuration
 */
const loggerConfig = {
    // Log level (debug, info, warn, error)
    level: (process.env.LOG_LEVEL || 'info'),
    // Console logging
    console: {
        enabled: true,
        colorize: process.env.NODE_ENV === 'development',
        timestamp: true
    },
    // File logging
    file: {
        enabled: process.env.LOG_TO_FILE === 'true',
        directory: process.env.LOG_DIRECTORY || './logs',
        filename: 'app.log',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
    },
    // Error logging to separate file
    errorFile: {
        enabled: true,
        directory: process.env.LOG_DIRECTORY || './logs',
        filename: 'error.log'
    }
};
/**
 * Log level hierarchy for filtering
 */
const logLevelHierarchy = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3
};
/**
 * Console colors for different log levels
 */
const logColors = {
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.WARN]: '\x1b[33m', // Yellow
    [LogLevel.INFO]: '\x1b[36m', // Cyan
    [LogLevel.DEBUG]: '\x1b[90m' // Gray
};
const resetColor = '\x1b[0m';
/**
 * Create log directory if it doesn't exist
 */
const ensureLogDirectory = (directory) => {
    if (!fs_1.default.existsSync(directory)) {
        fs_1.default.mkdirSync(directory, { recursive: true });
    }
};
/**
 * Format log entry for output
 */
const formatLogEntry = (entry, colorize = false) => {
    const { timestamp, level, message, meta, requestId, userId, ip } = entry;
    let formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    // Add context information
    const context = [];
    if (requestId)
        context.push(`reqId=${requestId}`);
    if (userId)
        context.push(`userId=${userId}`);
    if (ip)
        context.push(`ip=${ip}`);
    if (context.length > 0) {
        formattedMessage += ` [${context.join(', ')}]`;
    }
    // Add metadata
    if (meta) {
        formattedMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    // Apply colors for console output
    if (colorize && logColors[level]) {
        formattedMessage = `${logColors[level]}${formattedMessage}${resetColor}`;
    }
    return formattedMessage;
};
/**
 * Write log to file
 */
const writeToFile = async (entry, filename) => {
    try {
        const directory = loggerConfig.file.directory;
        ensureLogDirectory(directory);
        const filePath = path_1.default.join(directory, filename);
        const logLine = formatLogEntry(entry, false) + '\n';
        await fs_1.default.promises.appendFile(filePath, logLine);
    }
    catch (error) {
        console.error('Failed to write to log file:', error);
    }
};
/**
 * Check if log level should be output
 */
const shouldLog = (level) => {
    return logLevelHierarchy[level] <= logLevelHierarchy[loggerConfig.level];
};
/**
 * Core logging function
 */
const log = async (level, message, meta, context) => {
    // Skip if log level is below threshold
    if (!shouldLog(level)) {
        return;
    }
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        meta,
        ...context
    };
    // Console logging
    if (loggerConfig.console.enabled) {
        const formattedMessage = formatLogEntry(entry, loggerConfig.console.colorize);
        console.log(formattedMessage);
    }
    // File logging
    if (loggerConfig.file.enabled) {
        await writeToFile(entry, loggerConfig.file.filename);
    }
    // Error file logging
    if (level === LogLevel.ERROR && loggerConfig.errorFile.enabled) {
        await writeToFile(entry, loggerConfig.errorFile.filename);
    }
};
/**
 * Logger class with chainable methods
 */
class Logger {
    constructor() {
        this.context = {};
    }
    /**
     * Set request context
     */
    setContext(context) {
        this.context = { ...this.context, ...context };
        return this;
    }
    /**
     * Clear context
     */
    clearContext() {
        this.context = {};
        return this;
    }
    /**
     * Error level logging
     */
    async error(message, meta) {
        await log(LogLevel.ERROR, message, meta, this.context);
    }
    /**
     * Warning level logging
     */
    async warn(message, meta) {
        await log(LogLevel.WARN, message, meta, this.context);
    }
    /**
     * Info level logging
     */
    async info(message, meta) {
        await log(LogLevel.INFO, message, meta, this.context);
    }
    /**
     * Debug level logging
     */
    async debug(message, meta) {
        await log(LogLevel.DEBUG, message, meta, this.context);
    }
    /**
     * Log HTTP request
     */
    async logRequest(req, res, duration) {
        const message = `${req.method} ${req.url}`;
        const meta = {
            method: req.method,
            url: req.url,
            statusCode: res?.statusCode,
            duration: duration ? `${duration}ms` : undefined,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        };
        await this.info(message, meta);
    }
    /**
     * Log database query
     */
    async logQuery(query, duration, params) {
        const message = `Database query executed`;
        const meta = {
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            duration: duration ? `${duration}ms` : undefined,
            params: params
        };
        await this.debug(message, meta);
    }
    /**
     * Log authentication events
     */
    async logAuth(event, userId, success = true, details) {
        const level = success ? LogLevel.INFO : LogLevel.WARN;
        const message = `Authentication: ${event}`;
        const meta = {
            userId,
            success,
            ...details
        };
        await log(level, message, meta, this.context);
    }
    /**
     * Log business events
     */
    async logBusiness(event, details) {
        const message = `Business Event: ${event}`;
        await this.info(message, details);
    }
    /**
     * Log security events
     */
    async logSecurity(event, severity = 'medium', details) {
        const level = severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
        const message = `Security Event [${severity.toUpperCase()}]: ${event}`;
        await log(level, message, details, this.context);
    }
    /**
     * Log performance metrics
     */
    async logPerformance(operation, duration, details) {
        const message = `Performance: ${operation} completed in ${duration}ms`;
        const meta = {
            operation,
            duration,
            ...details
        };
        // Warn if operation takes too long
        const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
        await log(level, message, meta, this.context);
    }
}
/**
 * Global logger instance
 */
exports.logger = new Logger();
/**
 * Express middleware for request logging
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    // Generate request ID
    const requestId = Math.random().toString(36).substring(2, 15);
    req.requestId = requestId;
    // Set context for this request
    exports.logger.setContext({
        requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // Log request completion
    res.on('finish', () => {
        const duration = Date.now() - start;
        exports.logger.logRequest(req, res, duration);
    });
    next();
};
exports.requestLogger = requestLogger;
/**
 * Error logging utility
 */
const logError = async (error, context) => {
    await exports.logger.error(error.message, {
        name: error.name,
        stack: error.stack,
        ...context
    });
};
exports.logError = logError;
/**
 * Create child logger with specific context
 */
const createChildLogger = (context) => {
    const childLogger = new Logger();
    childLogger.setContext(context);
    return childLogger;
};
exports.createChildLogger = createChildLogger;
/**
 * Utility functions for testing
 */
exports.loggerUtils = {
    /**
     * Set log level dynamically
     */
    setLevel: (level) => {
        loggerConfig.level = level;
    },
    /**
     * Get current log level
     */
    getLevel: () => {
        return loggerConfig.level;
    },
    /**
     * Enable/disable console logging
     */
    setConsoleLogging: (enabled) => {
        loggerConfig.console.enabled = enabled;
    },
    /**
     * Enable/disable file logging
     */
    setFileLogging: (enabled) => {
        loggerConfig.file.enabled = enabled;
    }
};
// Export default logger
exports.default = exports.logger;
/**
 * Test helper functions (only in development)
 */
const testLogger = async () => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Test logger not available in production');
    }
    console.log('🧪 Testing logger functionality...');
    await exports.logger.debug('This is a debug message');
    await exports.logger.info('This is an info message');
    await exports.logger.warn('This is a warning message');
    await exports.logger.error('This is an error message');
    await exports.logger.logAuth('user_login', 'test-user-123', true, { method: 'email' });
    await exports.logger.logBusiness('session_booked', { sessionId: 'test-123', amount: 1000 });
    await exports.logger.logSecurity('suspicious_activity', 'high', { ip: '192.168.1.1' });
    await exports.logger.logPerformance('database_query', 150, { query: 'SELECT * FROM users' });
    console.log('✅ Logger test completed');
};
exports.testLogger = testLogger;
//# sourceMappingURL=logger.js.map