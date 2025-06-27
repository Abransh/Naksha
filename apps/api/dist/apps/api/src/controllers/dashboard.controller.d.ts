/**
 * Dashboard Controller
 * Provides comprehensive dashboard analytics and metrics for consultants
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
/**
 * GET /api/v1/dashboard/overview
 * Get comprehensive dashboard overview data
 */
export declare const getDashboardOverview: (req: AuthenticatedRequest, res: Response) => Promise<void>;
/**
 * GET /api/v1/dashboard/stats
 * Get additional dashboard statistics
 */
export declare const getDashboardStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=dashboard.controller.d.ts.map