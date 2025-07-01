/**
 * Shared Database Types
 *
 * Common types and interfaces used across the application
 * for database operations and data modeling.
 */
import type { Consultant, Admin, Session, Client, Quotation } from '@prisma/client';
export type ConsultantWithRelations = Consultant & {
    sessions?: Session[];
    clients?: Client[];
    quotations?: Quotation[];
};
export type AdminWithPermissions = Admin & {
    permissions?: string[];
};
export type SessionWithDetails = Session & {
    consultant: Consultant;
    client: Client;
};
export type SessionAnalytics = {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    revenue: number;
    averageSessionValue: number;
};
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface DateRangeFilter {
    startDate?: Date;
    endDate?: Date;
}
export interface SessionFilters extends PaginationParams, DateRangeFilter {
    status?: string[];
    sessionType?: string[];
    consultantId?: string;
    clientId?: string;
}
export interface ClientFilters extends PaginationParams {
    consultantId?: string;
    search?: string;
    isActive?: boolean;
}
export interface DashboardMetrics {
    totalSessions: number;
    totalClients: number;
    totalRevenue: number;
    revenueGrowth: number;
    sessionCompletionRate: number;
    averageSessionValue: number;
    topPerformingConsultants?: Array<{
        consultant: Consultant;
        sessionCount: number;
        revenue: number;
    }>;
}
export interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}
export interface RevenueBreakdown {
    sessionType: string;
    amount: number;
    percentage: number;
    count: number;
}
export interface DatabaseOperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface AuditLogEntry {
    action: string;
    userId: string;
    userType: 'consultant' | 'admin';
    resourceType: string;
    resourceId: string;
    changes?: Record<string, any>;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
}
export interface ValidationResult {
    success: boolean;
    data?: any;
    errors?: Array<{
        field: string;
        message: string;
        code: string;
    }>;
}
//# sourceMappingURL=types.d.ts.map