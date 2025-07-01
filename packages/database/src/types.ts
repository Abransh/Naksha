/**
 * Shared Database Types
 * 
 * Common types and interfaces used across the application
 * for database operations and data modeling.
 */

import type { consultants, admins, sessions, clients, quotations } from '@nakksha/database';

// ============================================================================
// USER TYPES
// ============================================================================

export type ConsultantWithRelations = consultants & {
  sessionss?: sessions[];
  clientss?: clients[];
  quotationss?: quotations[];
};

export type adminsWithPermissions = admins & {
  permissions?: string[];
};

// ============================================================================
// sessions TYPES
// ============================================================================

export type sessionsWithDetails = sessions & {
  consultant: consultants;
  clients: clients;
};

export type sessionsAnalytics = {
  totalsessionss: number;
  completedsessionss: number;
  cancelledsessionss: number;
  revenue: number;
  averagesessionsValue: number;
};

// ============================================================================
// QUERY FILTERS
// ============================================================================

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

export interface sessionsFilters extends PaginationParams, DateRangeFilter {
  status?: string[];
  sessionsType?: string[];
  consultantId?: string;
  clientsId?: string;
}

export interface clientsFilters extends PaginationParams {
  consultantId?: string;
  search?: string;
  isActive?: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface DashboardMetrics {
  totalsessionss: number;
  totalclientss: number;
  totalRevenue: number;
  revenueGrowth: number;
  sessionsCompletionRate: number;
  averagesessionsValue: number;
  topPerformingConsultants?: Array<{
    consultant: consultants;
    sessionsCount: number;
    revenue: number;
  }>;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueBreakdown {
  sessionsType: string;
  amount: number;
  percentage: number;
  count: number;
}

// ============================================================================
// DATABASE OPERATION RESULTS
// ============================================================================

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

// ============================================================================
// AUDIT AND LOGGING
// ============================================================================

export interface AuditLogEntry {
  action: string;
  userId: string;
  userType: 'consultant' | 'admins';
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// VALIDATION SCHEMAS (for Zod)
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}