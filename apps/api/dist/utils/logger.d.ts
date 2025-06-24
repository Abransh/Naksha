/**
 * Log levels enum
 */
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
/**
 * Logger class with chainable methods
 */
declare class Logger {
    private context;
    /**
     * Set request context
     */
    setContext(context: {
        requestId?: string;
        userId?: string;
        ip?: string;
        userAgent?: string;
    }): Logger;
    /**
     * Clear context
     */
    clearContext(): Logger;
    /**
     * Error level logging
     */
    error(message: string, meta?: any): Promise<void>;
    /**
     * Warning level logging
     */
    warn(message: string, meta?: any): Promise<void>;
    /**
     * Info level logging
     */
    info(message: string, meta?: any): Promise<void>;
    /**
     * Debug level logging
     */
    debug(message: string, meta?: any): Promise<void>;
    /**
     * Log HTTP request
     */
    logRequest(req: any, res?: any, duration?: number): Promise<void>;
    /**
     * Log database query
     */
    logQuery(query: string, duration?: number, params?: any): Promise<void>;
    /**
     * Log authentication events
     */
    logAuth(event: string, userId?: string, success?: boolean, details?: any): Promise<void>;
    /**
     * Log business events
     */
    logBusiness(event: string, details?: any): Promise<void>;
    /**
     * Log security events
     */
    logSecurity(event: string, severity?: 'low' | 'medium' | 'high', details?: any): Promise<void>;
    /**
     * Log performance metrics
     */
    logPerformance(operation: string, duration: number, details?: any): Promise<void>;
}
/**
 * Global logger instance
 */
export declare const logger: Logger;
/**
 * Express middleware for request logging
 */
export declare const requestLogger: (req: any, res: any, next: any) => void;
/**
 * Error logging utility
 */
export declare const logError: (error: Error, context?: any) => Promise<void>;
/**
 * Create child logger with specific context
 */
export declare const createChildLogger: (context: any) => Logger;
/**
 * Utility functions for testing
 */
export declare const loggerUtils: {
    /**
     * Set log level dynamically
     */
    setLevel: (level: LogLevel) => void;
    /**
     * Get current log level
     */
    getLevel: () => LogLevel;
    /**
     * Enable/disable console logging
     */
    setConsoleLogging: (enabled: boolean) => void;
    /**
     * Enable/disable file logging
     */
    setFileLogging: (enabled: boolean) => void;
};
export default logger;
/**
 * Test helper functions (only in development)
 */
export declare const testLogger: () => Promise<void>;
//# sourceMappingURL=logger.d.ts.map