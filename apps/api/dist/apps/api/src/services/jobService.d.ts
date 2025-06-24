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
/**
 * Initialize all background jobs
 */
export declare const startBackgroundJobs: () => Promise<void>;
/**
 * Get job statuses for monitoring
 */
export declare const getJobStatuses: () => JobStatus[];
/**
 * Get job statistics
 */
export declare const getJobStats: () => any;
/**
 * Run a specific job manually (for testing/admin purposes)
 */
export declare const runJobManually: (jobName: string) => Promise<boolean>;
/**
 * Stop all background jobs (for graceful shutdown)
 */
export declare const stopBackgroundJobs: () => void;
declare const _default: {
    startBackgroundJobs: () => Promise<void>;
    getJobStatuses: () => JobStatus[];
    getJobStats: () => any;
    runJobManually: (jobName: string) => Promise<boolean>;
    stopBackgroundJobs: () => void;
};
export default _default;
//# sourceMappingURL=jobService.d.ts.map