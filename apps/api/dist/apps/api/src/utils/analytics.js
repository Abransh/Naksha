"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAnalyticsData = exports.generateTrendAnalysis = exports.analyzeConsultantPerformance = exports.calculateRevenueAnalytics = exports.generateClientInsights = exports.calculateSessionMetrics = void 0;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
/**
 * Calculate comprehensive session metrics
 */
const calculateSessionMetrics = async (consultantId, dateRange) => {
    try {
        const cacheKey = `session_metrics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
        // Check cache first
        const cachedMetrics = await redis_1.cacheUtils.get(cacheKey);
        if (cachedMetrics) {
            return cachedMetrics;
        }
        const prisma = (0, database_1.getPrismaClient)();
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
        const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
        const cancelledSessions = sessions.filter((s) => s.status === 'CANCELLED');
        const pendingSessions = sessions.filter((s) => s.status === 'PENDING');
        // Calculate revenue
        const paidSessions = sessions.filter((s) => s.paymentStatus === 'PAID');
        const revenueGenerated = paidSessions.reduce((sum, session) => sum + Number(session.amount), 0);
        // Calculate completion and cancellation rates
        const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;
        const cancellationRate = totalSessions > 0 ? (cancelledSessions.length / totalSessions) * 100 : 0;
        // Calculate average duration
        const sessionsWithDuration = sessions.filter((s) => s.durationMinutes > 0);
        const averageDuration = sessionsWithDuration.length > 0
            ? sessionsWithDuration.reduce((sum, s) => sum + s.durationMinutes, 0) / sessionsWithDuration.length
            : 0;
        // Calculate average revenue
        const averageRevenue = paidSessions.length > 0 ? revenueGenerated / paidSessions.length : 0;
        // Calculate sessions per day
        const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
        const sessionsPerDay = daysDiff > 0 ? totalSessions / daysDiff : 0;
        // Analyze peak hours
        const hourCounts = new Map();
        sessions.forEach((session) => {
            if (session.scheduledTime) {
                const hour = new Date(`1970-01-01T${session.scheduledTime}`).getHours();
                hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
            }
        });
        const peakHours = Array.from(hourCounts.entries())
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        // Sessions by type
        const typeGroups = sessions.reduce((acc, session) => {
            const type = session.sessionType;
            if (!acc[type]) {
                acc[type] = { count: 0, revenue: 0 };
            }
            acc[type].count++;
            if (session.paymentStatus === 'PAID') {
                acc[type].revenue += Number(session.amount);
            }
            return acc;
        }, {});
        const sessionsByType = Object.entries(typeGroups).map(([type, data]) => ({
            type,
            count: data.count,
            revenue: data.revenue
        }));
        // Sessions by platform
        const platformGroups = sessions.reduce((acc, session) => {
            const platform = session.platform;
            acc[platform] = (acc[platform] || 0) + 1;
            return acc;
        }, {});
        const sessionsByPlatform = Object.entries(platformGroups).map(([platform, count]) => ({
            platform,
            count: count
        }));
        const metrics = {
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
        await redis_1.cacheUtils.set(cacheKey, metrics, 1800);
        return metrics;
    }
    catch (error) {
        console.error('❌ Calculate session metrics error:', error);
        throw new Error('Failed to calculate session metrics');
    }
};
exports.calculateSessionMetrics = calculateSessionMetrics;
/**
 * Generate client insights and behavior analysis
 */
const generateClientInsights = async (client) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
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
        const activeClients = allClients.filter((c) => c.totalSessions > 0).length;
        const repeatClients = allClients.filter((c) => c.totalSessions > 1).length;
        // Calculate growth metrics
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const newClients = allClients.filter((c) => c.createdAt >= thirtyDaysAgo).length;
        const clientRetentionRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;
        const averageSessionsPerClient = totalClients > 0
            ? allClients.reduce((sum, c) => sum + c.totalSessions, 0) / totalClients
            : 0;
        const averageRevenuePerClient = totalClients > 0
            ? allClients.reduce((sum, c) => sum + Number(c.totalAmountPaid), 0) / totalClients
            : 0;
        // Calculate growth rate
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const previousPeriodClients = allClients.filter((c) => c.createdAt >= sixtyDaysAgo && c.createdAt < thirtyDaysAgo).length;
        const clientGrowthRate = previousPeriodClients > 0
            ? ((newClients - previousPeriodClients) / previousPeriodClients) * 100
            : 0;
        // Top clients by revenue
        const topClientsByRevenue = allClients
            .sort((a, b) => Number(b.totalAmountPaid) - Number(a.totalAmountPaid))
            .slice(0, 10)
            .map((client) => ({
            id: client.id,
            name: client.name,
            email: client.email,
            totalRevenue: Number(client.totalAmountPaid),
            totalSessions: client.totalSessions
        }));
        // Clients by location
        const locationGroups = allClients.reduce((acc, client) => {
            if (client.city && client.state) {
                const location = `${client.city}, ${client.state}`;
                acc[location] = (acc[location] || 0) + 1;
            }
            return acc;
        }, {});
        const clientsByLocation = Object.entries(locationGroups)
            .map(([location, count]) => ({ location, count: count }))
            .sort((a, b) => b.count - a.count)
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
    }
    catch (error) {
        console.error('❌ Generate client insights error:', error);
        throw new Error('Failed to generate client insights');
    }
};
exports.generateClientInsights = generateClientInsights;
/**
 * Calculate revenue analytics and trends
 */
const calculateRevenueAnalytics = async (consultantId, dateRange) => {
    try {
        const cacheKey = `revenue_analytics:${consultantId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
        const cachedAnalytics = await redis_1.cacheUtils.get(cacheKey);
        if (cachedAnalytics) {
            return cachedAnalytics;
        }
        const prisma = (0, database_1.getPrismaClient)();
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
        const totalRevenue = paidSessions.reduce((sum, session) => sum + Number(session.amount), 0);
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
        const previousRevenue = previousPaidSessions.reduce((sum, session) => sum + Number(session.amount), 0);
        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        // Revenue by month
        const monthlyRevenue = new Map();
        paidSessions.forEach((session) => {
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
        const typeRevenue = paidSessions.reduce((acc, session) => {
            const type = session.sessionType;
            acc[type] = (acc[type] || 0) + Number(session.amount);
            return acc;
        }, {});
        const revenueBySessionType = Object.entries(typeRevenue).map(([type, revenue]) => ({
            type,
            revenue: revenue,
            percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
        }));
        // Calculate recurring vs one-time revenue
        const clientSessionCounts = new Map();
        paidSessions.forEach((session) => {
            const clientId = session.clientId;
            clientSessionCounts.set(clientId, (clientSessionCounts.get(clientId) || 0) + 1);
        });
        const recurringRevenue = paidSessions
            .filter((session) => (clientSessionCounts.get(session.clientId) || 0) > 1)
            .reduce((sum, session) => sum + Number(session.amount), 0);
        const oneTimeRevenue = totalRevenue - recurringRevenue;
        // Simple revenue projection (based on trend)
        const projectedRevenue = revenueGrowth > 0
            ? totalRevenue * (1 + (revenueGrowth / 100))
            : totalRevenue;
        const analytics = {
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
        await redis_1.cacheUtils.set(cacheKey, analytics, 3600);
        return analytics;
    }
    catch (error) {
        console.error('❌ Calculate revenue analytics error:', error);
        throw new Error('Failed to calculate revenue analytics');
    }
};
exports.calculateRevenueAnalytics = calculateRevenueAnalytics;
/**
 * Analyze consultant performance metrics
 */
const analyzeConsultantPerformance = async (consultantId, dateRange) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
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
        const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
        const paidSessions = sessions.filter((s) => s.paymentStatus === 'PAID');
        const totalRevenue = paidSessions.reduce((sum, session) => sum + Number(session.amount), 0);
        // Calculate average session duration
        const averageSessionDuration = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / completedSessions.length
            : 0;
        // Calculate booking conversion rate (simplified)
        const bookingConversionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;
        // Calculate repeat client rate
        const clientSessionCounts = new Map();
        sessions.forEach((session) => {
            clientSessionCounts.set(session.clientId, (clientSessionCounts.get(session.clientId) || 0) + 1);
        });
        const repeatClients = Array.from(clientSessionCounts.values()).filter(count => count > 1).length;
        const repeatClientRate = consultant.clients.length > 0
            ? (repeatClients / consultant.clients.length) * 100
            : 0;
        // Calculate monthly growth
        const currentMonth = new Date().getMonth();
        const currentMonthSessions = sessions.filter((s) => s.createdAt.getMonth() === currentMonth);
        const previousMonthSessions = sessions.filter((s) => s.createdAt.getMonth() === currentMonth - 1);
        const monthlyGrowth = previousMonthSessions.length > 0
            ? ((currentMonthSessions.length - previousMonthSessions.length) / previousMonthSessions.length) * 100
            : 0;
        // Analyze top performing services
        const servicePerformance = sessions.reduce((acc, session) => {
            const service = session.sessionType;
            if (!acc[service]) {
                acc[service] = { bookings: 0, revenue: 0 };
            }
            acc[service].bookings++;
            if (session.paymentStatus === 'PAID') {
                acc[service].revenue += Number(session.amount);
            }
            return acc;
        }, {});
        const topPerformingServices = Object.entries(servicePerformance)
            .map(([service, data]) => ({
            service,
            bookings: data.bookings,
            revenue: data.revenue
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
    }
    catch (error) {
        console.error('❌ Analyze consultant performance error:', error);
        throw new Error('Failed to analyze consultant performance');
    }
};
exports.analyzeConsultantPerformance = analyzeConsultantPerformance;
/**
 * Generate trend analysis and forecasting
 */
const generateTrendAnalysis = async (consultantId, months = 6) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
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
        const monthlyData = new Map();
        sessions.forEach((session) => {
            const monthKey = session.createdAt.toISOString().substring(0, 7);
            const existing = monthlyData.get(monthKey) || {
                sessions: 0,
                revenue: 0,
                newClients: new Set()
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
    }
    catch (error) {
        console.error('❌ Generate trend analysis error:', error);
        throw new Error('Failed to generate trend analysis');
    }
};
exports.generateTrendAnalysis = generateTrendAnalysis;
/**
 * Export analytics data to various formats
 */
const exportAnalyticsData = async (consultantId, dateRange, format = 'json') => {
    try {
        const [sessionMetrics, revenueAnalytics, clientInsights] = await Promise.all([
            (0, exports.calculateSessionMetrics)(consultantId, dateRange),
            (0, exports.calculateRevenueAnalytics)(consultantId, dateRange),
            // For client insights, we'll use a placeholder since we need a specific client
            Promise.resolve({})
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
    }
    catch (error) {
        console.error('❌ Export analytics data error:', error);
        throw new Error('Failed to export analytics data');
    }
};
exports.exportAnalyticsData = exportAnalyticsData;
exports.default = {
    calculateSessionMetrics: exports.calculateSessionMetrics,
    generateClientInsights: exports.generateClientInsights,
    calculateRevenueAnalytics: exports.calculateRevenueAnalytics,
    analyzeConsultantPerformance: exports.analyzeConsultantPerformance,
    generateTrendAnalysis: exports.generateTrendAnalysis,
    exportAnalyticsData: exports.exportAnalyticsData
};
//# sourceMappingURL=analytics.js.map