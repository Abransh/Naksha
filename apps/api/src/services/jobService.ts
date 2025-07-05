/**
 * File Path: apps/api/src/services/jobService.ts
 * 
 * Background Jobs Service
 * 
 * Handles all background tasks and scheduled jobs:
 * - Email queue processing
 * - Session reminders
 * - Data cleanup tasks
 * - Analytics data aggregation
 * - File cleanup and optimization
 * - Database maintenance
 * - Notification processing
 */

import cron from 'node-cron';
import { getPrismaClient } from '../config/database';
import { sendEmail} from './emailService';
import { cleanupTempFiles } from './uploadService';
import { logger } from '../utils/logger';

/**
 * Job status tracking
 */
interface JobStatus {
  name: string;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'error';
  errorMessage?: string;
  runCount: number;
}

const jobStatuses = new Map<string, JobStatus>();

/**
 * Update job status
 */
const updateJobStatus = (jobName: string, status: 'idle' | 'running' | 'error', errorMessage?: string): void => {
  const existingStatus = jobStatuses.get(jobName) || { name: jobName, runCount: 0, status: 'idle' };
  
  jobStatuses.set(jobName, {
    ...existingStatus,
    status,
    lastRun: new Date(),
    errorMessage,
    runCount: existingStatus.runCount + 1
  });
};

/**
 * Session reminder job
 * Runs every hour to check for sessions happening in 24 hours
 */
const sessionReminderJob = async (): Promise<void> => {
  const jobName = 'session-reminders';
  updateJobStatus(jobName, 'running');

  try {
    const prisma = getPrismaClient();
    
    // Get sessions happening in 24 hours that haven't been reminded
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const upcomingSessions = await prisma.session.findMany({
      where: {
        scheduledDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        },
        status: 'CONFIRMED',
        reminderSent: false
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        consultant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    let remindersSent = 0;

    for (const session of upcomingSessions) {
      try {
        // Send reminder to client
        const reminderSent = await sendEmail('session_reminder', {
          to: session.client.email,
          data: {
            clientName: session.client.name,
            consultantName: `${session.consultant.firstName} ${session.consultant.lastName}`,
            sessionDate: session.scheduledDate.toLocaleDateString(),
            sessionTime: session.scheduledDate.toLocaleTimeString(),
            platform: session.platform,
            meetingLink: session.meetingLink,
            meetingPassword: session.meetingPassword
          }
        }, session.consultantId);

        if (reminderSent) {
          // Mark reminder as sent
          await prisma.session.update({
            where: { id: session.id },
            data: { reminderSent: true }
          });
          
          remindersSent++;
        }

      } catch (error) {
        console.error(`❌ Failed to send reminder for session ${session.id}:`, error);
      }
    }

    updateJobStatus(jobName, 'idle');
    console.log(`✅ Session reminders job completed: ${remindersSent} reminders sent`);

  } catch (error) {
    console.error('❌ Session reminders job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Email queue processing job
 * Processes failed emails for retry
 */
const emailQueueJob = async (): Promise<void> => {
  const jobName = 'email-queue';
  updateJobStatus(jobName, 'running');

  try {
    const prisma = getPrismaClient();
    
    // Get failed emails from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const failedEmails = await prisma.emailLog.findMany({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: oneDayAgo
        }
      },
      take: 50, // Process 50 at a time
      orderBy: {
        createdAt: 'asc'
      }
    });

    let retriedEmails = 0;

    for (const failedEmail of failedEmails) {
      try {
        // Attempt to resend email
        // Note: This would need the original email data to be stored
        // For now, we'll just mark it as processed
        await prisma.emailLog.update({
          where: { id: failedEmail.id },
          data: { 
            status: 'QUEUED', // Will be retried by the email service
            errorMessage: 'Queued for retry by background job'
          }
        });
        
        retriedEmails++;

      } catch (error) {
        console.error(`❌ Failed to retry email ${failedEmail.id}:`, error);
      }
    }

    updateJobStatus(jobName, 'idle');
    console.log(`✅ Email queue job completed: ${retriedEmails} emails queued for retry`);

  } catch (error) {
    console.error('❌ Email queue job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Database cleanup job
 * Cleans up old data and optimizes database
 */
const databaseCleanupJob = async (): Promise<void> => {
  const jobName = 'database-cleanup';
  updateJobStatus(jobName, 'running');

  try {
    const prisma = getPrismaClient();
    
    const cleanupTasks = [
      // Clean up old refresh tokens (older than 30 days)
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { isRevoked: true },
            { expiresAt: { lt: new Date() } },
            { 
              createdAt: { 
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
              } 
            }
          ]
        }
      }),

      // Clean up old email logs (older than 90 days)
      prisma.emailLog.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Clean up old verification tokens (older than 24 hours)
      prisma.consultant.updateMany({
        where: {
          emailVerificationTokenExpires: {
            lt: new Date()
          }
        },
        data: {
          emailVerificationToken: null,
          emailVerificationTokenExpires: null
        }
      }),

      // Clean up old password reset tokens (older than 1 hour)
      prisma.consultant.updateMany({
        where: {
          passwordResetTokenExpires: {
            lt: new Date()
          }
        },
        data: {
          passwordResetToken: null,
          passwordResetTokenExpires: null
        }
      })
    ];

    const results = await Promise.allSettled(cleanupTasks);
    
    let totalCleaned = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        totalCleaned += (result.value as any).count || 0;
      } else {
        console.error(`❌ Cleanup task ${index} failed:`, result.reason);
      }
    });

    updateJobStatus(jobName, 'idle');
    console.log(`✅ Database cleanup job completed: ${totalCleaned} records cleaned`);

  } catch (error) {
    console.error('❌ Database cleanup job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * File cleanup job
 * Cleans up temporary files and unused uploads
 */
const fileCleanupJob = async (): Promise<void> => {
  const jobName = 'file-cleanup';
  updateJobStatus(jobName, 'running');

  try {
    // Clean up temporary files from Cloudinary
    await cleanupTempFiles();

    updateJobStatus(jobName, 'idle');
    console.log('✅ File cleanup job completed');

  } catch (error) {
    console.error('❌ File cleanup job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Analytics aggregation job
 * Aggregates data for dashboard analytics
 */
const analyticsAggregationJob = async (): Promise<void> => {
  const jobName = 'analytics-aggregation';
  updateJobStatus(jobName, 'running');

  try {
    const prisma = getPrismaClient();
    
    // Aggregate daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate yesterday's metrics
    const [
      dailySessions,
      dailyRevenue,
      newClients,
      newConsultants
    ] = await Promise.all([
      prisma.session.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          }
        }
      }),

      prisma.session.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          },
          paymentStatus: 'PAID'
        },
        _sum: {
          amount: true
        }
      }),

      prisma.client.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          }
        }
      }),

      prisma.consultant.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today
          }
        }
      })
    ]);

    // Store aggregated data (if we had an analytics table)
    // For now, just log the metrics
    const metrics = {
      date: yesterday,
      sessions: dailySessions,
      revenue: Number(dailyRevenue._sum.amount || 0),
      newClients,
      newConsultants
    };

    console.log('📊 Daily metrics aggregated:', metrics);

    updateJobStatus(jobName, 'idle');
    console.log('✅ Analytics aggregation job completed');

  } catch (error) {
    console.error('❌ Analytics aggregation job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Health check job
 * Monitors system health and sends alerts if needed
 */
const healthCheckJob = async (): Promise<void> => {
  const jobName = 'health-check';
  updateJobStatus(jobName, 'running');

  try {
    const prisma = getPrismaClient();
    
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check for failed jobs
    const failedJobs = Array.from(jobStatuses.values()).filter(job => job.status === 'error');
    
    if (failedJobs.length > 0) {
      console.warn(`⚠️ ${failedJobs.length} background jobs have failed:`, failedJobs.map(j => j.name));
      
      // In production, you might want to send alerts here
      // await sendAdminAlert('Background job failures detected', failedJobs);
    }

    // Check for high email failure rate
    const recentEmailLogs = await prisma.emailLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    if (recentEmailLogs.length > 0) {
      const failureRate = recentEmailLogs.filter((log:any) => log.status === 'FAILED').length / recentEmailLogs.length;
      
      if (failureRate > 0.5) { // More than 50% failure rate
        console.warn(`⚠️ High email failure rate detected: ${(failureRate * 100).toFixed(1)}%`);
      }
    }

    updateJobStatus(jobName, 'idle');
    console.log('✅ Health check job completed');

  } catch (error) {
    console.error('❌ Health check job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Session status update job
 * Updates session statuses based on scheduled times
 */
const sessionStatusUpdateJob = async (): Promise<void> => {
  const jobName = 'session-status-update';
  updateJobStatus(jobName, 'running');

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    
    // Mark sessions as 'IN_PROGRESS' if they started in the last 30 minutes
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    await prisma.session.updateMany({
      where: {
        scheduledDate: {
          gte: thirtyMinutesAgo,
          lte: now
        },
        status: 'CONFIRMED'
      },
      data: {
        status: 'IN_PROGRESS'
      }
    });

    // Mark sessions as 'COMPLETED' if they ended more than 1 hour ago
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    await prisma.session.updateMany({
      where: {
        scheduledDate: {
          lt: oneHourAgo
        },
        status: 'IN_PROGRESS'
      },
      data: {
        status: 'COMPLETED'
      }
    });

    updateJobStatus(jobName, 'idle');
    console.log('✅ Session status update job completed');

  } catch (error) {
    console.error('❌ Session status update job failed:', error);
    updateJobStatus(jobName, 'error', error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Initialize all background jobs
 */
export const startBackgroundJobs = async (): Promise<void> => {
  try {
    console.log('⚙️ Starting background jobs...');

    // Session reminders - every hour
    cron.schedule('0 * * * *', sessionReminderJob, {
      name: 'session-reminders',
      timezone: 'UTC'
    });

    // Email queue processing - every 15 minutes
    cron.schedule('*/15 * * * *', emailQueueJob, {
      name: 'email-queue',
      timezone: 'UTC'
    });

    // Database cleanup - daily at 2 AM
    cron.schedule('0 2 * * *', databaseCleanupJob, {
      name: 'database-cleanup',
      timezone: 'UTC'
    });

    // File cleanup - daily at 3 AM
    cron.schedule('0 3 * * *', fileCleanupJob, {
      name: 'file-cleanup',
      timezone: 'UTC'
    });

    // Analytics aggregation - daily at 1 AM
    cron.schedule('0 1 * * *', analyticsAggregationJob, {
      name: 'analytics-aggregation',
      timezone: 'UTC'
    });

    // Health check - every 30 minutes
    cron.schedule('*/30 * * * *', healthCheckJob, {
      name: 'health-check',
      timezone: 'UTC'
    });

    // Session status updates - every 10 minutes
    cron.schedule('*/10 * * * *', sessionStatusUpdateJob, {
      name: 'session-status-update',
      timezone: 'UTC'
    });

    // Initialize job statuses
    [
      'session-reminders',
      'email-queue', 
      'database-cleanup',
      'file-cleanup',
      'analytics-aggregation',
      'health-check',
      'session-status-update'
    ].forEach(jobName => {
      jobStatuses.set(jobName, {
        name: jobName,
        status: 'idle',
        runCount: 0
      });
    });

    console.log('✅ Background jobs started successfully');
    console.log(`📋 Scheduled jobs: ${jobStatuses.size}`);

    // Log the cron schedule for each job
    if (process.env.NODE_ENV === 'development') {
      console.log('📅 Job schedules:');
      console.log('  - Session reminders: Every hour');
      console.log('  - Email queue: Every 15 minutes');
      console.log('  - Database cleanup: Daily at 2 AM');
      console.log('  - File cleanup: Daily at 3 AM');
      console.log('  - Analytics: Daily at 1 AM');
      console.log('  - Health check: Every 30 minutes');
      console.log('  - Session status: Every 10 minutes');
    }

  } catch (error) {
    console.error('❌ Failed to start background jobs:', error);
    throw new Error('Background job initialization failed');
  }
};

/**
 * Get job statuses for monitoring
 */
export const getJobStatuses = (): JobStatus[] => {
  return Array.from(jobStatuses.values());
};

/**
 * Get job statistics
 */
export const getJobStats = (): any => {
  const jobs = Array.from(jobStatuses.values());
  
  return {
    total: jobs.length,
    running: jobs.filter(j => j.status === 'running').length,
    failed: jobs.filter(j => j.status === 'error').length,
    idle: jobs.filter(j => j.status === 'idle').length,
    totalRuns: jobs.reduce((sum, job) => sum + job.runCount, 0),
    jobs: jobs.map(job => ({
      name: job.name,
      status: job.status,
      lastRun: job.lastRun,
      runCount: job.runCount,
      error: job.errorMessage
    }))
  };
};

/**
 * Run a specific job manually (for testing/admin purposes)
 */
export const runJobManually = async (jobName: string): Promise<boolean> => {
  try {
    switch (jobName) {
      case 'session-reminders':
        await sessionReminderJob();
        break;
      case 'email-queue':
        await emailQueueJob();
        break;
      case 'database-cleanup':
        await databaseCleanupJob();
        break;
      case 'file-cleanup':
        await fileCleanupJob();
        break;
      case 'analytics-aggregation':
        await analyticsAggregationJob();
        break;
      case 'health-check':
        await healthCheckJob();
        break;
      case 'session-status-update':
        await sessionStatusUpdateJob();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Manual job run failed for ${jobName}:`, error);
    return false;
  }
};

/**
 * Stop all background jobs (for graceful shutdown)
 */
export const stopBackgroundJobs = (): void => {
  try {
    cron.getTasks().forEach((task : any , name :any ) => {
      task.stop();
      console.log(`🛑 Stopped job: ${name}`);
    });
    
    console.log('✅ All background jobs stopped');
  } catch (error) {
    console.error('❌ Error stopping background jobs:', error);
  }
};

export default {
  startBackgroundJobs,
  getJobStatuses,
  getJobStats,
  runJobManually,
  stopBackgroundJobs
};