/**
 * Database Configuration and Connection Manager
 * 
 * This module handles:
 * - Prisma client initialization
 * - Database connection management
 * - Connection health checks
 * - Graceful disconnection
 * - Error handling and reconnection logic
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance
 * Using singleton pattern to ensure single connection across the app
 */
let prisma: PrismaClient;

/**
 * Database connection configuration
 */
const databaseConfig = {
  // Connection pool settings
  connectionLimit: 20,
  
  // Connection timeout settings
  connectTimeout: 10000, // 10 seconds
  queryTimeout: 30000,   // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  
  // Logging configuration
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
};

/**
 * Initialize Prisma client with proper configuration
 * @returns Promise<PrismaClient> - Configured Prisma client
 */
export const initializePrisma = async (): Promise<PrismaClient> => {
  try {
    if (!prisma) {
      console.log('🔧 Initializing Prisma client...');
      
      prisma = new PrismaClient({
        log: databaseConfig.log,
        errorFormat: 'pretty',
        
        // Datasource configuration
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // Add middleware for query logging in development
      if (process.env.NODE_ENV === 'development') {
        prisma.$use(async (params: any, next: any) => {
          const before = Date.now();
          const result = await next(params);
          const after = Date.now();
          
          console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
          return result;
        });
      }

      // Add middleware for error logging
      prisma.$use(async (params: any, next: any) => {
        try {
          return await next(params);
        } catch (error) {
          console.error(`Database error in ${params.model}.${params.action}:`, error);
          throw error;
        }
      });

      console.log('✅ Prisma client initialized successfully');
    }

    return prisma;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma client:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
};

/**
 * Connect to the database with retry logic
 * @returns Promise<void>
 */
export const connectDatabase = async (): Promise<void> => {
  let retries = 0;
  
  while (retries < databaseConfig.maxRetries) {
    try {
      if (!prisma) {
        prisma = await initializePrisma();
      }

      // Test the connection
      await prisma.$connect();
      
      // Verify connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      console.log('✅ Database connection established successfully');
      return;
      
    } catch (error) {
      retries++;
      console.error(`❌ Database connection attempt ${retries} failed:`, error);
      
      if (retries >= databaseConfig.maxRetries) {
        throw new Error(`Failed to connect to database after ${databaseConfig.maxRetries} attempts`);
      }
      
      console.log(`⏳ Retrying database connection in ${databaseConfig.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, databaseConfig.retryDelay));
    }
  }
};

/**
 * Disconnect from the database gracefully
 * @returns Promise<void>
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
    throw error;
  }
};

/**
 * Check database health
 * @returns Promise<boolean> - True if database is healthy
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!prisma) {
      return false;
    }

    // Simple health check query
    await prisma.$queryRaw`SELECT 1`;
    return true;
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
};

/**
 * Get database connection info
 * @returns Object with connection details
 */
export const getDatabaseInfo = async () => {
  try {
    if (!prisma) {
      throw new Error('Database not connected');
    }

    // Get database version and connection info
    const [version] = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version() as version
    `;

    const [connectionCount] = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;

    return {
      version: version.version,
      activeConnections: connectionCount.count,
      isConnected: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to get database info:', error);
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Execute database transaction with retry logic
 * @param operation - Function to execute within transaction
 * @returns Promise<T> - Result of the operation
 */
export const executeTransaction = async <T>(
  operation: (tx: any) => Promise<T>
): Promise<T> => {
  if (!prisma) {
    throw new Error('Database not connected');
  }

  let retries = 0;
  
  while (retries < databaseConfig.maxRetries) {
    try {
      return await prisma.$transaction(operation, {
        timeout: databaseConfig.queryTimeout,
        maxWait: databaseConfig.connectTimeout,
      });
      
    } catch (error: any) {
      retries++;
      
      // Check if it's a retryable error
      const isRetryable = error.code === 'P2034' || // Transaction conflict
                         error.code === 'P1017' || // Server has closed the connection
                         error.message?.includes('connection');
      
      if (isRetryable && retries < databaseConfig.maxRetries) {
        console.warn(`🔄 Transaction failed, retrying (${retries}/${databaseConfig.maxRetries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, databaseConfig.retryDelay * retries));
        continue;
      }
      
      console.error('❌ Transaction failed permanently:', error);
      throw error;
    }
  }

  throw new Error('Transaction failed after maximum retries');
};

/**
 * Get the Prisma client instance
 * @returns PrismaClient - The global Prisma client
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return prisma;
};

/**
 * Database utilities for common operations
 */
export const dbUtils = {
  /**
   * Check if a record exists
   */
  exists: async (model: string, where: any): Promise<boolean> => {
    try {
      const count = await (prisma as any)[model].count({ where });
      return count > 0;
    } catch (error) {
      console.error(`❌ Error checking existence in ${model}:`, error);
      return false;
    }
  },

  /**
   * Get record count with optional filters
   */
  count: async (model: string, where: any = {}): Promise<number> => {
    try {
      return await (prisma as any)[model].count({ where });
    } catch (error) {
      console.error(`❌ Error counting records in ${model}:`, error);
      return 0;
    }
  },

  /**
   * Soft delete a record (mark as inactive)
   */
  softDelete: async (model: string, id: string): Promise<boolean> => {
    try {
      await (prisma as any)[model].update({
        where: { id },
        data: { isActive: false, updatedAt: new Date() }
      });
      return true;
    } catch (error) {
      console.error(`❌ Error soft deleting record in ${model}:`, error);
      return false;
    }
  }
};

// Export default instance
// Initialize prisma client
initializePrisma();

export default prisma;

/**
 * Testing utilities for database operations
 * Only available in development/test environments
 */
export const dbTestUtils = process.env.NODE_ENV !== 'production' ? {
  /**
   * Clear all data from database (USE WITH CAUTION!)
   */
  clearDatabase: async (): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production');
    }

    console.warn('⚠️ Clearing database - this will delete all data!');
    
    // Delete in correct order to avoid foreign key constraints
    const models = [
      'message', 'conversation', 'emailLog', 'dailyAnalytics',
      'paymentTransaction', 'quotation', 'availabilitySlot',
      'session', 'client', 'consultant', 'admin'
    ];

    for (const model of models) {
      await (prisma as any)[model].deleteMany({});
      console.log(`🗑️ Cleared ${model} table`);
    }
  },

  /**
   * Seed database with test data
   */
  seedTestData: async (): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot seed test data in production');
    }

    console.log('🌱 Seeding test data...');
    
    // Create test consultant
    const testConsultant = await prisma.consultant.create({
      data: {
        email: 'test@consultant.com',
        passwordHash: '$2a$10$example', // This should be properly hashed
        firstName: 'Test',
        lastName: 'Consultant',
        phoneNumber: '9876543210',
        slug: 'test-consultant',
        personalSessionPrice: 1000.00,
        webinarSessionPrice: 500.00,
        isActive: true,
        isEmailVerified: true
      }
    });

    console.log('✅ Test data seeded successfully');
  }
} : {};