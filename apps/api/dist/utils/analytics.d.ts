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
    peakHours: Array<{
        hour: number;
        count: number;
    }>;
    sessionsByType: Array<{
        type: string;
        count: number;
        revenue: number;
    }>;
    sessionsByPlatform: Array<{
        platform: string;
        count: number;
    }>;
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
export declare const calculateSessionMetrics: (consultantId: string, dateRange: DateRange) => Promise<SessionMetrics>;
/**
 * Generate client insights and behavior analysis
 */
export declare const generateClientInsights: (client: any) => Promise<ClientInsights>;
/**
 * Calculate revenue analytics and trends
 */
export declare const calculateRevenueAnalytics: (consultantId: string, dateRange: DateRange) => Promise<RevenueAnalytics>;
/**
 * Analyze consultant performance metrics
 */
export declare const analyzeConsultantPerformance: (consultantId: string, dateRange: DateRange) => Promise<ConsultantPerformance>;
/**
 * Generate trend analysis and forecasting
 */
export declare const generateTrendAnalysis: (consultantId: string, months?: number) => Promise<any>;
/**
 * Export analytics data to various formats
 */
export declare const exportAnalyticsData: (consultantId: string, dateRange: DateRange, format?: "json" | "csv") => Promise<any>;
declare const _default: {
    calculateSessionMetrics: (consultantId: string, dateRange: DateRange) => Promise<SessionMetrics>;
    generateClientInsights: (client: any) => Promise<ClientInsights>;
    calculateRevenueAnalytics: (consultantId: string, dateRange: DateRange) => Promise<RevenueAnalytics>;
    analyzeConsultantPerformance: (consultantId: string, dateRange: DateRange) => Promise<ConsultantPerformance>;
    generateTrendAnalysis: (consultantId: string, months?: number) => Promise<any>;
    exportAnalyticsData: (consultantId: string, dateRange: DateRange, format?: "json" | "csv") => Promise<any>;
};
export default _default;
//# sourceMappingURL=analytics.d.ts.map