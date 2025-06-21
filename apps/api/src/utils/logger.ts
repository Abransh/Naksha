// apps/api/src/utils/logger.ts
// Nakksha Consulting Platform - Logging Utility
// Comprehensive logging system with different levels and structured output
// Supports development debugging and production monitoring

import fs from 'fs';
import path from 'path';

/**
 * Log levels enum
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log entry interface
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Logger configuration
 */
const loggerConfig = {
  // Log level (debug, info, warn, error)
  level: (process.env.LOG_LEVEL || 'info') as LogLevel,
  
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
const logLevelHierarchy: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3
};

/**
 * Console colors for different log levels
 */
const logColors: Record<LogLevel, string> = {
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.INFO]: '\x1b[36m',  // Cyan
  [LogLevel.DEBUG]: '\x1b[90m'  // Gray
};

const resetColor = '\x1b[0m';

/**
 * Create log directory if it doesn't exist
 */
const ensureLogDirectory = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

/**
 * Format log entry for output
 */
const formatLogEntry = (entry: LogEntry, colorize = false): string => {
  const { timestamp, level, message, meta, requestId, userId, ip } = entry;
  
  let formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  // Add context information
  const context: string[] = [];
  if (requestId) context.push(`reqId=${requestId}`);
  if (userId) context.push(`userId=${userId}`);
  if (ip) context.push(`ip=${ip}`);
  
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
const writeToFile = async (entry: LogEntry, filename: string): Promise<void> => {
  try {
    const directory = loggerConfig.file.directory;
    ensureLogDirectory(directory);
    
    const filePath = path.join(directory, filename);
    const logLine = formatLogEntry(entry, false) + '\n';
    
    await fs.promises.appendFile(filePath, logLine);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

/**
 * Check if log level should be output
 */
const shouldLog = (level: LogLevel): boolean => {
  return logLevelHierarchy[level] <= logLevelHierarchy[loggerConfig.level];
};

/**
 * Core logging function
 */
const log = async (
  level: LogLevel,
  message: string,
  meta?: any,
  context?: {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
  }
): Promise<void> => {
  // Skip if log level is below threshold
  if (!shouldLog(level)) {
    return;
  }
  
  const entry: LogEntry = {
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
  private context: {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
  } = {};
  
  /**
   * Set request context
   */
  setContext(context: {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
  }): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }
  
  /**
   * Clear context
   */
  clearContext(): Logger {
    this.context = {};
    return this;
  }
  
  /**
   * Error level logging
   */
  async error(message: string, meta?: any): Promise<void> {
    await log(LogLevel.ERROR, message, meta, this.context);
  }
  
  /**
   * Warning level logging
   */
  async warn(message: string, meta?: any): Promise<void> {
    await log(LogLevel.WARN, message, meta, this.context);
  }
  
  /**
   * Info level logging
   */
  async info(message: string, meta?: any): Promise<void> {
    await log(LogLevel.INFO, message, meta, this.context);
  }
  
  /**
   * Debug level logging
   */
  async debug(message: string, meta?: any): Promise<void> {
    await log(LogLevel.DEBUG, message, meta, this.context);
  }
  
  /**
   * Log HTTP request
   */
  async logRequest(req: any, res?: any, duration?: number): Promise<void> {
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
  async logQuery(query: string, duration?: number, params?: any): Promise<void> {
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
  async logAuth(event: string, userId?: string, success = true, details?: any): Promise<void> {
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
  async logBusiness(event: string, details?: any): Promise<void> {
    const message = `Business Event: ${event}`;
    await this.info(message, details);
  }
  
  /**
   * Log security events
   */
  async logSecurity(event: string, severity: 'low' | 'medium' | 'high' = 'medium', details?: any): Promise<void> {
    const level = severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    const message = `Security Event [${severity.toUpperCase()}]: ${event}`;
    await log(level, message, details, this.context);
  }
  
  /**
   * Log performance metrics
   */
  async logPerformance(operation: string, duration: number, details?: any): Promise<void> {
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
export const logger = new Logger();

/**
 * Express middleware for request logging
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Generate request ID
  const requestId = Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;
  
  // Set context for this request
  logger.setContext({
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

/**
 * Error logging utility
 */
export const logError = async (error: Error, context?: any): Promise<void> => {
  await logger.error(error.message, {
    name: error.name,
    stack: error.stack,
    ...context
  });
};

/**
 * Create child logger with specific context
 */
export const createChildLogger = (context: any): Logger => {
  const childLogger = new Logger();
  childLogger.setContext(context);
  return childLogger;
};

/**
 * Utility functions for testing
 */
export const loggerUtils = {
  /**
   * Set log level dynamically
   */
  setLevel: (level: LogLevel): void => {
    loggerConfig.level = level;
  },
  
  /**
   * Get current log level
   */
  getLevel: (): LogLevel => {
    return loggerConfig.level;
  },
  
  /**
   * Enable/disable console logging
   */
  setConsoleLogging: (enabled: boolean): void => {
    loggerConfig.console.enabled = enabled;
  },
  
  /**
   * Enable/disable file logging
   */
  setFileLogging: (enabled: boolean): void => {
    loggerConfig.file.enabled = enabled;
  }
};

// Export default logger
export default logger;

/**
 * Test helper functions (only in development)
 */
export const testLogger = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test logger not available in production');
  }
  
  console.log('🧪 Testing logger functionality...');
  
  await logger.debug('This is a debug message');
  await logger.info('This is an info message');
  await logger.warn('This is a warning message');
  await logger.error('This is an error message');
  
  await logger.logAuth('user_login', 'test-user-123', true, { method: 'email' });
  await logger.logBusiness('session_booked', { sessionId: 'test-123', amount: 1000 });
  await logger.logSecurity('suspicious_activity', 'high', { ip: '192.168.1.1' });
  await logger.logPerformance('database_query', 150, { query: 'SELECT * FROM users' });
  
  console.log('✅ Logger test completed');
};