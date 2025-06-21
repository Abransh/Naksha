/**
 * Dashboard Routes
 * 
 * Handles all dashboard-related endpoints:
 * - Analytics and metrics calculation
 * - Chart data preparation
 * - Recent activity feeds
 * - Performance insights
 * - Real-time dashboard updates
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { cacheUtils } from '../../config/redis';
import { AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';

const router = Router();

/**
 * Validation schemas
 */
const timeframeSchema = z.object({
  timeframe: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).optional().default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Interface for dashboard metrics
 */
interface DashboardMetrics {
  // Session Metrics
  totalSessions: number;
  pendingSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  abandonedSessions: number;
  sessionCompletionRate: number;
  
  // Revenue Metrics
  totalRevenue: number;
  revenueToday: number;
  averageSessionValue: number;
  revenueGrowth: number;
  
  // Client Metrics
  totalClients: number;
  newClientsToday: number;
  activeClients: number;
  repeatClientRate: number;
  
  // Business Metrics
  quotationsSent: number;
  quotationsAccepted: number;
  quotationConversionRate: number;
}

/**
 * Interface for chart data
 */
interface ChartData {
  sessionsTrend: Array<{
    date: string;
    sessions: number;
    revenue: number;
    completedSessions: number;
  }>;
  
  revenueBreakdown: Array<{
    sessionType: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  
  clientsGrowth: Array<{
    period: string;
    newClients: number;
    totalClients: number;
  }>;
  
  sessionStatusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Utility function to get date range based on timeframe
 */
const getDateRange = (timeframe: string, startDate?: string, endDate?: string) => {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (timeframe) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required for custom timeframe');
      }
      start = new Date(startDate);
      end = new Date(endDate);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
};

/**
 * Calculate comprehensive dashboard metrics
 */
const calculateDashboardMetrics = async (
  consultantId: string,
  dateRange: { start: Date; end: Date }
): Promise<DashboardMetrics> => {
  const prisma = getPrismaClient();
  const { start, end } = dateRange;

  // Get all sessions in the date range
  const sessions = await prisma.session.findMany({
    where: {
      consultantId,
      createdAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      client: true
    }
  });

  // Get sessions from today specifically
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todaySessions = sessions.filter(s => s.createdAt >= todayStart);

  // Get all clients for the consultant
  const allClients = await prisma.client.findMany({
    where: { consultantId },
    select: {
      id: true,
      createdAt: true,
      totalSessions: true
    }
  });

  // Get quotations in the date range
  const quotations = await prisma.quotation.findMany({
    where: {
      consultantId,
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });

  // Calculate session metrics
  const totalSessions = sessions.length;
  const pendingSessions = sessions.filter(s => s.status === 'PENDING').length;
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
  const cancelledSessions = sessions.filter(s => s.status === 'CANCELLED').length;
  const abandonedSessions = sessions.filter(s => s.status === 'ABANDONED').length;
  const sessionCompletionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  // Calculate revenue metrics
  const paidSessions = sessions.filter(s => s.paymentStatus === 'PAID');
  const totalRevenue = paidSessions.reduce((sum, session) => sum + Number(session.amount), 0);
  const todayRevenue = todaySessions
    .filter(s => s.paymentStatus === 'PAID')
    .reduce((sum, session) => sum + Number(session.amount), 0);
  const averageSessionValue = paidSessions.length > 0 ? totalRevenue / paidSessions.length : 0;

  // Calculate revenue growth (compare with previous period)
  const periodLength = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodLength);
  const previousEnd = start;
  
  const previousSessions = await prisma.session.findMany({
    where: {
      consultantId,
      createdAt: {
        gte: previousStart,
        lte: previousEnd
      },
      paymentStatus: 'PAID'
    }
  });
  
  const previousRevenue = previousSessions.reduce((sum, session) => sum + Number(session.amount), 0);
  const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  // Calculate client metrics
  const totalClients = allClients.length;
  const newClientsToday = allClients.filter(c => c.createdAt >= todayStart).length;
  const activeClients = allClients.filter(c => c.totalSessions > 0).length;
  const repeatClients = allClients.filter(c => c.totalSessions > 1).length;
  const repeatClientRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

  // Calculate quotation metrics
  const quotationsSent = quotations.filter(q => q.status !== 'DRAFT').length;
  const quotationsAccepted = quotations.filter(q => q.status === 'ACCEPTED').length;
  const quotationConversionRate = quotationsSent > 0 ? (quotationsAccepted / quotationsSent) * 100 : 0;

  return {
    totalSessions,
    pendingSessions,
    completedSessions,
    cancelledSessions,
    abandonedSessions,
    sessionCompletionRate,
    totalRevenue,
    revenueToday: todayRevenue,
    averageSessionValue,
    revenueGrowth,
    totalClients,
    newClientsToday,
    activeClients,
    repeatClientRate,
    quotationsSent,
    quotationsAccepted,
    quotationConversionRate
  };
};

/**
 * Generate chart data for dashboard visualizations
 */
const generateChartData = async (
  consultantId: string,
  dateRange: { start: Date; end: Date }
): Promise<ChartData> => {
  const prisma = getPrismaClient();
  const { start, end } = dateRange;

  // Sessions trend data (daily aggregation)
  const sessions = await prisma.session.findMany({
    where: {
      consultantId,
      createdAt: {
        gte: start,
        lte: end
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group sessions by date
  const sessionsByDate = new Map<string, any[]>();
  sessions.forEach(session => {
    const date = session.createdAt.toISOString().split('T')[0];
    if (!sessionsByDate.has(date)) {
      sessionsByDate.set(date, []);
    }
    sessionsByDate.get(date)!.push(session);
  });

  const sessionsTrend = Array.from(sessionsByDate.entries()).map(([date, dailySessions]) => ({
    date,
    sessions: dailySessions.length,
    revenue: dailySessions
      .filter(s => s.paymentStatus === 'PAID')
      .reduce((sum, s) => sum + Number(s.amount), 0),
    completedSessions: dailySessions.filter(s => s.status === 'COMPLETED').length
  }));

  // Revenue breakdown by session type
  const personalSessions = sessions.filter(s => s.sessionType === 'PERSONAL' && s.paymentStatus === 'PAID');
  const webinarSessions = sessions.filter(s => s.sessionType === 'WEBINAR' && s.paymentStatus === 'PAID');
  
  const personalRevenue = personalSessions.reduce((sum, s) => sum + Number(s.amount), 0);
  const webinarRevenue = webinarSessions.reduce((sum, s) => sum + Number(s.amount), 0);
  const totalRevenue = personalRevenue + webinarRevenue;

  const revenueBreakdown = [
    {
      sessionType: 'Personal Sessions',
      amount: personalRevenue,
      percentage: totalRevenue > 0 ? (personalRevenue / totalRevenue) * 100 : 0,
      count: personalSessions.length
    },
    {
      sessionType: 'Webinar Sessions',
      amount: webinarRevenue,
      percentage: totalRevenue > 0 ? (webinarRevenue / totalRevenue) * 100 : 0,
      count: webinarSessions.length
    }
  ];

  // Client growth data (monthly aggregation)
  const clients = await prisma.client.findMany({
    where: { consultantId },
    orderBy: { createdAt: 'asc' }
  });

  const clientsByMonth = new Map<string, number>();
  let runningTotal = 0;
  
  clients.forEach(client => {
    const month = client.createdAt.toISOString().substring(0, 7); // YYYY-MM
    clientsByMonth.set(month, (clientsByMonth.get(month) || 0) + 1);
  });

  const clientsGrowth = Array.from(clientsByMonth.entries()).map(([period, newClients]) => {
    runningTotal += newClients;
    return {
      period,
      newClients,
      totalClients: runningTotal
    };
  });

  // Session status distribution
  const statusCounts = new Map<string, number>();
  sessions.forEach(session => {
    const status = session.status;
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  const sessionStatusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status: status.toLowerCase().replace('_', ' '),
    count,
    percentage: sessions.length > 0 ? (count / sessions.length) * 100 : 0
  }));

  return {
    sessionsTrend,
    revenueBreakdown,
    clientsGrowth,
    sessionStatusDistribution
  };
};

/**
 * GET /api/dashboard/metrics
 * Get comprehensive dashboard metrics
 */
router.get('/metrics',
  validateRequest(timeframeSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { timeframe, startDate, endDate } = req.query as any;
      const consultantId = req.user!.id;

      // Check cache first
      const cacheKey = `dashboard_metrics:${consultantId}:${timeframe}:${startDate || ''}:${endDate || ''}`;
      const cachedMetrics = await cacheUtils.get(cacheKey);
      
      if (cachedMetrics) {
        res.json({
          data: cachedMetrics,
          fromCache: true
        });
        return;
      }

      // Calculate date range
      const dateRange = getDateRange(timeframe, startDate, endDate);

      // Calculate metrics
      const metrics = await calculateDashboardMetrics(consultantId, dateRange);

      // Cache for 5 minutes
      await cacheUtils.setWithAutoTTL(cacheKey, metrics, 'shortCache');

      res.json({
        data: metrics,
        fromCache: false,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Dashboard metrics error:', error);
      res.status(500).json({
        error: 'Failed to get dashboard metrics',
        message: 'An error occurred while calculating your dashboard metrics',
        code: 'METRICS_ERROR'
      });
    }
  }
);

/**
 * GET /api/dashboard/charts
 * Get chart data for dashboard visualizations
 */
router.get('/charts',
  validateRequest(timeframeSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { timeframe, startDate, endDate } = req.query as any;
      const consultantId = req.user!.id;

      // Check cache first
      const cacheKey = `dashboard_charts:${consultantId}:${timeframe}:${startDate || ''}:${endDate || ''}`;
      const cachedCharts = await cacheUtils.get(cacheKey);
      
      if (cachedCharts) {
        res.json({
          data: cachedCharts,
          fromCache: true
        });
        return;
      }

      // Calculate date range
      const dateRange = getDateRange(timeframe, startDate, endDate);

      // Generate chart data
      const chartData = await generateChartData(consultantId, dateRange);

      // Cache for 10 minutes
      await cacheUtils.set(cacheKey, chartData, 600);

      res.json({
        data: chartData,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Dashboard charts error:', error);
      res.status(500).json({
        error: 'Failed to get chart data',
        message: 'An error occurred while generating your charts',
        code: 'CHARTS_ERROR'
      });
    }
  }
);

/**
 * GET /api/dashboard/recent-activity
 * Get recent activity feed for dashboard
 */
router.get('/recent-activity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const consultantId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    // Check cache first
    const cacheKey = `recent_activity:${consultantId}:${limit}`;
    const cachedActivity = await cacheUtils.get(cacheKey);
    
    if (cachedActivity) {
      res.json({
        data: cachedActivity,
        fromCache: true
      });
      return;
    }

    const prisma = getPrismaClient();

    // Get recent sessions
    const recentSessions = await prisma.session.findMany({
      where: { consultantId },
      include: {
        client: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 2)
    });

    // Get recent quotations
    const recentQuotations = await prisma.quotation.findMany({
      where: { consultantId },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3)
    });

    // Get recent clients
    const recentClients = await prisma.client.findMany({
      where: { consultantId },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 4)
    });

    // Combine and format activity items
    const activities: any[] = [];

    // Add session activities
    recentSessions.forEach(session => {
      activities.push({
        id: session.id,
        type: 'session',
        action: getSessionAction(session.status),
        title: session.title,
        description: `Session with ${session.client.name}`,
        amount: Number(session.amount),
        status: session.status,
        timestamp: session.createdAt,
        metadata: {
          clientName: session.client.name,
          sessionType: session.sessionType,
          platform: session.platform
        }
      });
    });

    // Add quotation activities
    recentQuotations.forEach(quotation => {
      activities.push({
        id: quotation.id,
        type: 'quotation',
        action: getQuotationAction(quotation.status),
        title: quotation.quotationName,
        description: `Quotation for ${quotation.clientName}`,
        amount: Number(quotation.finalAmount),
        status: quotation.status,
        timestamp: quotation.createdAt,
        metadata: {
          clientName: quotation.clientName,
          viewCount: quotation.viewCount
        }
      });
    });

    // Add client activities
    recentClients.forEach(client => {
      activities.push({
        id: client.id,
        type: 'client',
        action: 'registered',
        title: 'New client registration',
        description: `${client.name} joined as a client`,
        amount: 0,
        status: 'active',
        timestamp: client.createdAt,
        metadata: {
          clientName: client.name,
          totalSessions: client.totalSessions
        }
      });
    });

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // Cache for 2 minutes
    await cacheUtils.set(cacheKey, sortedActivities, 120);

    res.json({
      data: sortedActivities,
      fromCache: false
    });

  } catch (error) {
    console.error('❌ Recent activity error:', error);
    res.status(500).json({
      error: 'Failed to get recent activity',
      message: 'An error occurred while fetching your recent activity',
      code: 'ACTIVITY_ERROR'
    });
  }
});

/**
 * GET /api/dashboard/summary
 * Get quick summary stats for dashboard header
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const consultantId = req.user!.id;

    // Check cache first
    const cacheKey = `dashboard_summary:${consultantId}`;
    const cachedSummary = await cacheUtils.get(cacheKey);
    
    if (cachedSummary) {
      res.json({
        data: cachedSummary,
        fromCache: true
      });
      return;
    }

    const prisma = getPrismaClient();

    // Get quick counts in parallel
    const [
      totalSessions,
      totalClients,
      totalRevenue,
      pendingSessions
    ] = await Promise.all([
      prisma.session.count({ where: { consultantId } }),
      prisma.client.count({ where: { consultantId } }),
      prisma.session.aggregate({
        where: { consultantId, paymentStatus: 'PAID' },
        _sum: { amount: true }
      }),
      prisma.session.count({ where: { consultantId, status: 'PENDING' } })
    ]);

    const summary = {
      totalSessions,
      totalClients,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      pendingSessions,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 3 minutes
    await cacheUtils.set(cacheKey, summary, 180);

    res.json({
      data: summary,
      fromCache: false
    });

  } catch (error) {
    console.error('❌ Dashboard summary error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard summary',
      message: 'An error occurred while fetching your dashboard summary',
      code: 'SUMMARY_ERROR'
    });
  }
});

/**
 * Helper functions
 */
function getSessionAction(status: string): string {
  switch (status) {
    case 'PENDING': return 'scheduled';
    case 'CONFIRMED': return 'confirmed';
    case 'COMPLETED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    case 'ABANDONED': return 'abandoned';
    default: return 'updated';
  }
}

function getQuotationAction(status: string): string {
  switch (status) {
    case 'DRAFT': return 'created';
    case 'SENT': return 'sent';
    case 'VIEWED': return 'viewed';
    case 'ACCEPTED': return 'accepted';
    case 'REJECTED': return 'rejected';
    default: return 'updated';
  }
}

export default router;