/**
 * Dashboard Controller
 * Provides comprehensive dashboard analytics and metrics for consultants
 */

import { Request, Response } from 'express';
import { getPrismaClient } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * GET /api/v1/dashboard/overview
 * Get comprehensive dashboard overview data
 */
export const getDashboardOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const consultantId = req.user.id;
    const prisma = getPrismaClient();

    // Get current date and date 30 days ago for comparison
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Parallel data fetching for optimal performance
    const [
      // Revenue data
      currentRevenue,
      previousRevenue,
      
      // Client data
      totalClients,
      previousTotalClients,
      
      // Quotation data
      totalQuotations,
      previousTotalQuotations,
      
      // Session data
      allSessions,
      pendingSessions,
      completedSessions,
      abandonedSessions,
      previousAllSessions,
      
      // Recent sessions for display
      recentSessions,
      
      // Time series data for chart (last 7 days)
      weeklySessionData
    ] = await Promise.all([
      // Current period revenue (last 30 days)
      prisma.paymentTransaction.aggregate({
        where: {
          consultantId,
          status: 'SUCCESS',
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: { amount: true }
      }),
      
      // Previous period revenue (30-60 days ago)
      prisma.paymentTransaction.aggregate({
        where: {
          consultantId,
          status: 'SUCCESS',
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        },
        _sum: { amount: true }
      }),
      
      // Current client count
      prisma.client.count({
        where: { 
          consultantId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // Previous client count
      prisma.client.count({
        where: { 
          consultantId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      }),
      
      // Current quotations shared (not draft)
      prisma.quotation.count({
        where: {
          consultantId,
          status: { not: 'DRAFT' },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // Previous quotations shared
      prisma.quotation.count({
        where: {
          consultantId,
          status: { not: 'DRAFT' },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      }),
      
      // All sessions
      prisma.session.count({
        where: { consultantId }
      }),
      
      // Pending sessions
      prisma.session.count({
        where: { 
          consultantId,
          status: 'PENDING'
        }
      }),
      
      // Completed sessions
      prisma.session.count({
        where: { 
          consultantId,
          status: 'COMPLETED'
        }
      }),
      
      // Abandoned sessions (cancelled + no show)
      prisma.session.count({
        where: {
          consultantId,
          status: { in: ['CANCELLED', 'NO_SHOW'] }
        }
      }),
      
      // Previous period all sessions
      prisma.session.count({
        where: { 
          consultantId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      }),
      
      // Recent sessions (last 10)
      prisma.session.findMany({
        where: { consultantId },
        include: {
          client: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Weekly session data for chart (last 7 days)
      prisma.session.findMany({
        where: {
          consultantId,
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          createdAt: true,
          status: true,
          amount: true
        }
      })
    ]);

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    };

    // Revenue calculations
    const currentRevenueAmount = currentRevenue._sum.amount?.toNumber() || 0;
    const previousRevenueAmount = previousRevenue._sum.amount?.toNumber() || 0;
    const revenueChange = calculatePercentageChange(currentRevenueAmount, previousRevenueAmount);

    // Client calculations
    const clientChange = calculatePercentageChange(totalClients, previousTotalClients);

    // Quotation calculations
    const quotationChange = calculatePercentageChange(totalQuotations, previousTotalQuotations);

    // Session calculations
    const sessionChange = calculatePercentageChange(allSessions, previousAllSessions);
    const abandonedPercentage = allSessions > 0 ? Math.round((abandonedSessions / allSessions) * 100 * 100) / 100 : 0;

    // Process weekly data for chart
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = weeklySessionData.filter(session => 
        session.createdAt.toISOString().split('T')[0] === dateStr
      );
      
      chartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: dayData.length,
        revenue: dayData.reduce((sum, session) => sum + (session.amount?.toNumber() || 0), 0)
      });
    }

    // Consultant services count (this would be based on consultant profile)
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      select: {
        personalSessionPrice: true,
        webinarSessionPrice: true,
        profileCompleted: true
      }
    });

    const allServices = [
      consultant?.personalSessionPrice ? 'Personal Sessions' : null,
      consultant?.webinarSessionPrice ? 'Webinar Sessions' : null
    ].filter(Boolean).length;

    const activeServices = allServices; // All configured services are considered active

    // Revenue split data (for now, all revenue is from Naksha platform)
    const revenueFromNaksha = currentRevenueAmount;
    const revenueManuallyAdded = 0; // This would be tracked separately in future

    const dashboardData = {
      // Revenue card data
      revenue: {
        amount: currentRevenueAmount,
        change: revenueChange,
        withdrawn: 0 // TODO: Add withdrawal tracking
      },
      
      // Client card data
      clients: {
        total: totalClients,
        change: clientChange,
        quotationsShared: totalQuotations,
        quotationChange: quotationChange
      },
      
      // Sessions card data
      sessions: {
        all: allSessions,
        pending: pendingSessions,
        completed: completedSessions,
        change: sessionChange,
        abandonedPercentage: abandonedPercentage
      },
      
      // Services card data
      services: {
        all: allServices,
        active: activeServices,
        change: 0 // TODO: Track service changes
      },
      
      // Revenue split chart data
      revenueSplit: {
        fromNaksha: revenueFromNaksha,
        manuallyAdded: revenueManuallyAdded,
        total: revenueFromNaksha + revenueManuallyAdded
      },
      
      // Recent sessions
      recentSessions: recentSessions.map(session => ({
        id: session.id,
        title: session.title,
        clientName: session.client.name,
        clientEmail: session.client.email,
        amount: session.amount.toNumber(),
        status: session.status,
        scheduledDate: session.scheduledDate,
        createdAt: session.createdAt
      })),
      
      // Chart data for summary
      chartData,
      
      // Additional metrics
      metrics: {
        totalRevenue: currentRevenueAmount,
        totalClients: await prisma.client.count({ where: { consultantId } }),
        totalSessions: allSessions,
        completionRate: allSessions > 0 ? Math.round((completedSessions / allSessions) * 100) : 0,
        averageSessionValue: allSessions > 0 ? Math.round(currentRevenueAmount / allSessions) : 0
      }
    };

    res.json({
      message: 'Dashboard overview retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard overview error:', error);
    res.status(500).json({
      error: 'Dashboard data retrieval failed',
      message: 'An error occurred while fetching dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
};

/**
 * GET /api/v1/dashboard/stats
 * Get additional dashboard statistics
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const consultantId = req.user.id;
    const prisma = getPrismaClient();

    // Get various statistics
    const [monthlyRevenue, sessionsByType, paymentMethods, topClients] = await Promise.all([
      // Monthly revenue trend (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM payment_transactions 
        WHERE consultant_id = ${consultantId} 
          AND status = 'SUCCESS'
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `,
      
      // Sessions by type
      prisma.session.groupBy({
        by: ['sessionType'],
        where: { consultantId },
        _count: { sessionType: true },
        _sum: { amount: true }
      }),
      
      // Payment methods breakdown
      prisma.paymentTransaction.groupBy({
        by: ['paymentMethod'],
        where: { 
          consultantId,
          status: 'SUCCESS'
        },
        _count: { paymentMethod: true },
        _sum: { amount: true }
      }),
      
      // Top clients by revenue
      prisma.client.findMany({
        where: { consultantId },
        select: {
          id: true,
          name: true,
          email: true,
          totalSessions: true,
          totalAmountPaid: true
        },
        orderBy: { totalAmountPaid: 'desc' },
        take: 5
      })
    ]);

    res.json({
      message: 'Dashboard statistics retrieved successfully',
      data: {
        monthlyRevenue,
        sessionsByType,
        paymentMethods,
        topClients
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      error: 'Dashboard statistics retrieval failed',
      message: 'An error occurred while fetching dashboard statistics',
      code: 'DASHBOARD_STATS_ERROR'
    });
  }
};