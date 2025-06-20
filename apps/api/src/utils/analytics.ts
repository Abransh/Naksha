/**
 * File Path: apps/api/src/utils/analytics.ts
 * 
 * Analytics and Metrics Utilities
 * 
 * Provides comprehensive analytics calculations for:
 * - Session performance metrics
 * - Revenue analytics
 * - Client behavior insights
 * - Consultant performance tracking
 * - Business intelligence data
 * - Trend analysis and forecasting
 */

import { getPrismaClient } from '../config/database';
import { cacheUtils } from '../config/redis';

/**
 * Analytics interfaces
 */
interface DateRange {
  start: Date;
  end: Date;
}

interface SessionMetrics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  pendingSessions: number;
  averageDuration: number;
  completionRate: number;
  cancellationRate: number;
  revenueGenerated: number;
  averageRevenue: number;
  sessionsPerDay: number;
  peakHours: Array<{ hour: number; count: number }>;
  sessionsByType: Array<{ type: string; count: number; revenue: number }>;
  sessionsByPlatform: Array<{ platform: string; count: number }>;
}

interface ClientInsights {
  totalClients: number;
  newClients: number;
  activeClients: number;
  repeatClients: number;
  clientRetentionRate: number;
  averageSessionsPerClient: number;
  averageRevenuePerClient: number;
  clientGrowthRate: number;
  topClientsByRevenue: Array<{
    id: string;
    name: string;
    email: string;
    totalRevenue: number;
    totalSessions: number;
  }>;
  clientsByLocation: Array<{
    location: string;
    count: number;
  }>;
}

interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowth: number;
  averageTransactionValue: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  revenueBySessionType: Array<{
    type: string;
    revenue: number;
    percentage: number;
  }>;
  projectedRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
}

interface ConsultantPerformance {
  overallRating: number;
  totalSessions: number;
  totalRevenue: number;
  clientSatisfactionScore: number;
  averageSessionDuration: number;
  responseTime: number;
  bookingConversionRate: number;
  repeatClientRate: number;
  monthlyGrowth: number;
  topPerformingServices: Array<{
    service: string;
    bookings: number;
    revenue: number;
  }>;
}

/**
 * Calculate comprehensive session metrics
 */
export const calculateSessionMetrics = async (
  consultantId: string,
  dateRange: DateRange
): Promise<SessionMetrics> => {
  try {
    const cacheKey = `session_metrics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    
    // Check cache first
    const cachedMetrics = await cacheUtils.get(cacheKey);
    if (cachedMetrics) {
      return cachedMetrics;
    }

    const prisma = getPrismaClient();

    // Get all sessions in date range
    const sessions = await prisma.session.findMany({
      where: {
        consultantId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      include: {
        client: {
          select: { id: true, name: true }
        }
      }
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s:any) => s.status === 'COMPLETED');
    const cancelledSessions = sessions.filter((s:any) => s.status === 'CANCELLED');
    const pendingSessions = sessions.filter((s:any) => s.status === 'PENDING');

    // Calculate revenue
    const paidSessions = sessions.filter((s:any) => s.paymentStatus === 'PAID');
    const revenueGenerated = paidSessions.reduce((sum: any, session:any ) => sum + Number(session.amount), 0);

    // Calculate completion and cancellation rates
    const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;
    const cancellationRate = totalSessions > 0 ? (cancelledSessions.length / totalSessions) * 100 : 0;

    // Calculate average duration
    const sessionsWithDuration = sessions.filter((s:any) => s.durationMinutes > 0);
    const averageDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum:any, s:any) => sum + s.durationMinutes, 0) / sessionsWithDuration.length
      : 0;

    // Calculate average revenue
    const averageRevenue = paidSessions.length > 0 ? revenueGenerated / paidSessions.length : 0;

    // Calculate sessions per day
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const sessionsPerDay = daysDiff > 0 ? totalSessions / daysDiff : 0;

    // Analyze peak hours
    const hourCounts = new Map<number, number>();
    sessions.forEach((session:any) => {
      if (session.scheduledTime) {
        const hour = new Date(`1970-01-01T${session.scheduledTime}`).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });

    const peakHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 5);

    // Sessions by type
    const typeGroups = sessions.reduce((acc:any, session:any) => {
      const type = session.sessionType;
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      acc[type].count++;
      if (session.paymentStatus === 'PAID') {
        acc[type].revenue += Number(session.amount);
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const sessionsByType = Object.entries(typeGroups).map(([type, data]) => ({
      type,
      count: (data as any).count,
      revenue: (data as any).revenue
    }));

    // Sessions by platform
    const platformGroups = sessions.reduce((acc:any, session:any) => {
      const platform = session.platform;
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sessionsByPlatform = Object.entries(platformGroups).map(([platform, count]) => ({
      platform,
      count: count as number
    }));

    const metrics: SessionMetrics = {
      totalSessions,
      completedSessions: completedSessions.length,
      cancelledSessions: cancelledSessions.length,
      pendingSessions: pendingSessions.length,
      averageDuration,
      completionRate,
      cancellationRate,
      revenueGenerated,
      averageRevenue,
      sessionsPerDay,
      peakHours,
      sessionsByType,
      sessionsByPlatform
    };

    // Cache for 30 minutes
    await cacheUtils.set(cacheKey, metrics, 1800);

    return metrics;

  } catch (error) {
    console.error('❌ Calculate session metrics error:', error);
    throw new Error('Failed to calculate session metrics');
  }
};

/**
 * Generate client insights and behavior analysis
 */
export const generateClientInsights = async (
  client: any
): Promise<ClientInsights> => {
  try {
    const prisma = getPrismaClient();
    const consultantId = client.consultantId;

    // Get all clients for the consultant
    const allClients = await prisma.client.findMany({
      where: { consultantId },
      include: {
        sessions: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    const totalClients = allClients.length;
    const activeClients = allClients.filter((c:any)=> c.totalSessions > 0).length;
    const repeatClients = allClients.filter((c:any) => c.totalSessions > 1).length;

    // Calculate growth metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newClients = allClients.filter((c:any) => c.createdAt >= thirtyDaysAgo).length;

    const clientRetentionRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;
    const averageSessionsPerClient = totalClients > 0 
      ? allClients.reduce((sum:any, c:any) => sum + c.totalSessions, 0) / totalClients 
      : 0;
    const averageRevenuePerClient = totalClients > 0
      ? allClients.reduce((sum:any, c:any) => sum + Number(c.totalAmountPaid), 0) / totalClients
      : 0;

    // Calculate growth rate
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const previousPeriodClients = allClients.filter((c:any) => 
      c.createdAt >= sixtyDaysAgo && c.createdAt < thirtyDaysAgo
    ).length;
    
    const clientGrowthRate = previousPeriodClients > 0 
      ? ((newClients - previousPeriodClients) / previousPeriodClients) * 100 
      : 0;

    // Top clients by revenue
    const topClientsByRevenue = allClients
      .sort((a:any, b:any) => Number(b.totalAmountPaid) - Number(a.totalAmountPaid))
      .slice(0, 10)
      .map((client:any) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        totalRevenue: Number(client.totalAmountPaid),
        totalSessions: client.totalSessions
      }));

    // Clients by location
    const locationGroups = allClients.reduce((acc:any, client:any) => {
      if (client.city && client.state) {
        const location = `${client.city}, ${client.state}`;
        acc[location] = (acc[location] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const clientsByLocation = Object.entries(locationGroups)
      .map(([location, count]) => ({ location, count: count as number }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 10);

    return {
      totalClients,
      newClients,
      activeClients,
      repeatClients,
      clientRetentionRate,
      averageSessionsPerClient,
      averageRevenuePerClient,
      clientGrowthRate,
      topClientsByRevenue,
      clientsByLocation
    };

  } catch (error) {
    console.error('❌ Generate client insights error:', error);
    throw new Error('Failed to generate client insights');
  }
};

/**
 * Calculate revenue analytics and trends
 */
export const calculateRevenueAnalytics = async (
  consultantId: string,
  dateRange: DateRange
): Promise<RevenueAnalytics> => {
  try {
    const cacheKey = `revenue_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    
    const cachedAnalytics = await cacheUtils.get(cacheKey);
    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    const prisma = getPrismaClient();

    // Get paid sessions in date range
    const paidSessions = await prisma.session.findMany({
      where: {
        consultantId,
        paymentStatus: 'PAID',
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      }
    });

    const totalRevenue = paidSessions.reduce((sum:any, session:any) => sum + Number(session.amount), 0);
    const totalTransactions = paidSessions.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate revenue growth
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodLength);
    const previousEnd = dateRange.start;

    const previousPaidSessions = await prisma.session.findMany({
      where: {
        consultantId,
        paymentStatus: 'PAID',
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        }
      }
    });

    const previousRevenue = previousPaidSessions.reduce((sum:any, session:any) => sum + Number(session.amount), 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Revenue by month
    const monthlyRevenue = new Map<string, { revenue: number; transactions: number }>();
    paidSessions.forEach((session:any) => {
      const monthKey = session.createdAt.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyRevenue.get(monthKey) || { revenue: 0, transactions: 0 };
      monthlyRevenue.set(monthKey, {
        revenue: existing.revenue + Number(session.amount),
        transactions: existing.transactions + 1
      });
    });

    const revenueByMonth = Array.from(monthlyRevenue.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        transactions: data.transactions
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Revenue by session type
    const typeRevenue = paidSessions.reduce((acc:any, session:any) => {
      const type = session.sessionType;
      acc[type] = (acc[type] || 0) + Number(session.amount);
      return acc;
    }, {} as Record<string, number>);

    const revenueBySessionType = Object.entries(typeRevenue).map(([type, revenue]) => ({
      type,
      revenue: revenue as number,
      percentage: totalRevenue > 0 ? ((revenue as number) / totalRevenue) * 100 : 0
    }));

    // Calculate recurring vs one-time revenue
    const clientSessionCounts = new Map<string, number>();
    paidSessions.forEach((session:any) => {
      const clientId = session.clientId;
      clientSessionCounts.set(clientId, (clientSessionCounts.get(clientId) || 0) + 1);
    });

    const recurringRevenue = paidSessions
      .filter((session:any) => (clientSessionCounts.get(session.clientId) || 0) > 1)
      .reduce((sum:any, session:any) => sum + Number(session.amount), 0);
    
    const oneTimeRevenue = totalRevenue - recurringRevenue;

    // Simple revenue projection (based on trend)
    const projectedRevenue = revenueGrowth > 0 
      ? totalRevenue * (1 + (revenueGrowth / 100))
      : totalRevenue;

    const analytics: RevenueAnalytics = {
      totalRevenue,
      revenueGrowth,
      averageTransactionValue,
      revenueByMonth,
      revenueBySessionType,
      projectedRevenue,
      recurringRevenue,
      oneTimeRevenue
    };

    // Cache for 1 hour
    await cacheUtils.set(cacheKey, analytics, 3600);

    return analytics;

  } catch (error) {
    console.error('❌ Calculate revenue analytics error:', error);
    throw new Error('Failed to calculate revenue analytics');
  }
};

/**
 * Analyze consultant performance metrics
 */
export const analyzeConsultantPerformance = async (
  consultantId: string,
  dateRange: DateRange
): Promise<ConsultantPerformance> => {
  try {
    const prisma = getPrismaClient();

    // Get consultant data
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      include: {
        sessions: {
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          }
        },
        clients: true
      }
    });

    if (!consultant) {
      throw new Error('Consultant not found');
    }

    const sessions = consultant.sessions;
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s:any) => s.status === 'COMPLETED');
    const paidSessions = sessions.filter((s:any) => s.paymentStatus === 'PAID');

    const totalRevenue = paidSessions.reduce((sum:any, session:any) => sum + Number(session.amount), 0);

    // Calculate average session duration
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum:any, s:any) => sum + s.durationMinutes, 0) / completedSessions.length
      : 0;

    // Calculate booking conversion rate (simplified)
    const bookingConversionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

    // Calculate repeat client rate
    const clientSessionCounts = new Map<string, number>();
    sessions.forEach((session:any) => {
      clientSessionCounts.set(session.clientId, (clientSessionCounts.get(session.clientId) || 0) + 1);
    });
    
    const repeatClients = Array.from(clientSessionCounts.values()).filter(count => count > 1).length;
    const repeatClientRate = consultant.clients.length > 0 
      ? (repeatClients / consultant.clients.length) * 100 
      : 0;

    // Calculate monthly growth
    const currentMonth = new Date().getMonth();
    const currentMonthSessions = sessions.filter((s:any) => s.createdAt.getMonth() === currentMonth);
    const previousMonthSessions = sessions.filter((s:any) => s.createdAt.getMonth() === currentMonth - 1);
    
    const monthlyGrowth = previousMonthSessions.length > 0
      ? ((currentMonthSessions.length - previousMonthSessions.length) / previousMonthSessions.length) * 100
      : 0;

    // Analyze top performing services
    const servicePerformance = sessions.reduce((acc:any, session:any) => {
      const service = session.sessionType;
      if (!acc[service]) {
        acc[service] = { bookings: 0, revenue: 0 };
      }
      acc[service].bookings++;
      if (session.paymentStatus === 'PAID') {
        acc[service].revenue += Number(session.amount);
      }
      return acc;
    }, {} as Record<string, { bookings: number; revenue: number }>);

    const topPerformingServices = Object.entries(servicePerformance)
      .map(([service, data]) => ({
        service,
        bookings: (data as any).bookings,
        revenue: (data as any).revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Placeholder values for metrics that would require additional data
    const overallRating = 4.5; // Would come from client feedback
    const clientSatisfactionScore = 85; // Would come from surveys
    const responseTime = 2.5; // Hours - would come from message response tracking

    return {
      overallRating,
      totalSessions,
      totalRevenue,
      clientSatisfactionScore,
      averageSessionDuration,
      responseTime,
      bookingConversionRate,
      repeatClientRate,
      monthlyGrowth,
      topPerformingServices
    };

  } catch (error) {
    console.error('❌ Analyze consultant performance error:', error);
    throw new Error('Failed to analyze consultant performance');
  }
};

/**
 * Generate trend analysis and forecasting
 */
export const generateTrendAnalysis = async (
  consultantId: string,
  months: number = 6
): Promise<any> => {
  try {
    const prisma = getPrismaClient();

    // Get historical data for trend analysis
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const sessions = await prisma.session.findMany({
      where: {
        consultantId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group sessions by month
    const monthlyData = new Map<string, {
      sessions: number;
      revenue: number;
      newClients: Set<string>;
    }>();

    sessions.forEach((session:any) => {
      const monthKey = session.createdAt.toISOString().substring(0, 7);
      const existing = monthlyData.get(monthKey) || {
        sessions: 0,
        revenue: 0,
        newClients: new Set<string>()
      };

      existing.sessions++;
      if (session.paymentStatus === 'PAID') {
        existing.revenue += Number(session.amount);
      }
      existing.newClients.add(session.clientId);

      monthlyData.set(monthKey, existing);
    });

    // Convert to array format
    const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      sessions: data.sessions,
      revenue: data.revenue,
      newClients: data.newClients.size,
      averageRevenue: data.sessions > 0 ? data.revenue / data.sessions : 0
    }));

    // Calculate growth rates
    const trendsWithGrowth = trends.map((trend, index) => {
      const previous = trends[index - 1];
      return {
        ...trend,
        sessionGrowth: previous ? ((trend.sessions - previous.sessions) / previous.sessions) * 100 : 0,
        revenueGrowth: previous ? ((trend.revenue - previous.revenue) / previous.revenue) * 100 : 0,
        clientGrowth: previous ? ((trend.newClients - previous.newClients) / previous.newClients) * 100 : 0
      };
    });

    // Simple forecasting (linear trend)
    if (trendsWithGrowth.length >= 3) {
      const recentTrends = trendsWithGrowth.slice(-3);
      const avgSessionGrowth = recentTrends.reduce((sum, t) => sum + t.sessionGrowth, 0) / 3;
      const avgRevenueGrowth = recentTrends.reduce((sum, t) => sum + t.revenueGrowth, 0) / 3;

      const lastMonth = trendsWithGrowth[trendsWithGrowth.length - 1];
      const forecast = {
        nextMonthSessions: Math.round(lastMonth.sessions * (1 + avgSessionGrowth / 100)),
        nextMonthRevenue: lastMonth.revenue * (1 + avgRevenueGrowth / 100),
        confidence: Math.min(85, Math.max(60, 85 - Math.abs(avgSessionGrowth) * 2)) // Simple confidence calculation
      };

      return {
        trends: trendsWithGrowth,
        forecast,
        insights: {
          averageSessionGrowth: avgSessionGrowth,
          averageRevenueGrowth: avgRevenueGrowth,
          totalGrowthPeriod: `${months} months`,
          recommendation: avgSessionGrowth > 10 ? 'Strong growth - consider expanding services' :
                         avgSessionGrowth > 0 ? 'Steady growth - maintain current strategy' :
                         'Consider marketing initiatives to boost growth'
        }
      };
    }

    return {
      trends: trendsWithGrowth,
      insights: {
        totalPeriod: `${months} months`,
        dataPoints: trendsWithGrowth.length,
        note: 'Insufficient data for forecasting. Need at least 3 months of data.'
      }
    };

  } catch (error) {
    console.error('❌ Generate trend analysis error:', error);
    throw new Error('Failed to generate trend analysis');
  }
};

/**
 * Export analytics data to various formats
 */
export const exportAnalyticsData = async (
  consultantId: string,
  dateRange: DateRange,
  format: 'json' | 'csv' = 'json'
): Promise<any> => {
  try {
    const [sessionMetrics, revenueAnalytics, clientInsights] = await Promise.all([
      calculateSessionMetrics(consultantId, dateRange),
      calculateRevenueAnalytics(consultantId, dateRange),
      // For client insights, we'll use a placeholder since we need a specific client
      Promise.resolve({} as ClientInsights)
    ]);

    const analyticsData = {
      exportDate: new Date().toISOString(),
      consultantId,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      sessionMetrics,
      revenueAnalytics,
      summary: {
        totalRevenue: revenueAnalytics.totalRevenue,
        totalSessions: sessionMetrics.totalSessions,
        completionRate: sessionMetrics.completionRate,
        averageRevenue: sessionMetrics.averageRevenue
      }
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = [
        ['Metric', 'Value'],
        ['Total Revenue', revenueAnalytics.totalRevenue],
        ['Total Sessions', sessionMetrics.totalSessions],
        ['Completion Rate', `${sessionMetrics.completionRate}%`],
        ['Average Revenue', sessionMetrics.averageRevenue],
        ['Revenue Growth', `${revenueAnalytics.revenueGrowth}%`]
      ];

      return csvData.map(row => row.join(',')).join('\n');
    }

    return analyticsData;

  } catch (error) {
    console.error('❌ Export analytics data error:', error);
    throw new Error('Failed to export analytics data');
  }
};

export default {
  calculateSessionMetrics,
  generateClientInsights,
  calculateRevenueAnalytics,
  analyzeConsultantPerformance,
  generateTrendAnalysis,
  exportAnalyticsData
};