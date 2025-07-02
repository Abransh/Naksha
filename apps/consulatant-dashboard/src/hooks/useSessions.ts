/**
 * Session Management Hook
 * Handles all session-related operations for the consultant dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { sessionApi, ApiError } from '@/lib/api';

// Session types
export interface Session {
  id: string;
  title: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  amount: number;
  currency: string;
  platform: 'ZOOM' | 'MEET' | 'TEAMS';
  meetingLink?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'ABANDONED' | 'NO_SHOW';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  paymentMethod?: string;
  notes?: string;
  consultantNotes?: string;
  isRepeatClient: boolean;
  bookingSource?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    totalSessions: number;
  };
}

export interface SessionSummary {
  totalSessions: number;
  pendingSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  abandonedSessions: number;
  repeatClients: number;
  clientsDidntJoin: number;
  totalRevenue: number;
  pendingRevenue: number;
  completedRevenue: number;
}

export interface SessionFilters {
  status?: Session['status'];
  paymentStatus?: Session['paymentStatus'];
  sessionType?: Session['sessionType'];
  platform?: Session['platform'];
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateSessionData {
  clientId: string;
  title: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  amount: number;
  platform: 'ZOOM' | 'MEET' | 'TEAMS';
  notes?: string;
  paymentMethod: 'online' | 'cash' | 'bank_transfer';
}

export interface UpdateSessionData {
  title?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  amount?: number;
  platform?: 'ZOOM' | 'MEET' | 'TEAMS';
  status?: Session['status'];
  paymentStatus?: Session['paymentStatus'];
  notes?: string;
  consultantNotes?: string;
}

export interface SessionsResponse {
  sessions: Session[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: SessionFilters;
}

export const useSessions = (
  initialFilters: SessionFilters = {},
  autoRefresh = true
) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<SessionSummary>({
    totalSessions: 0,
    pendingSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    abandonedSessions: 0,
    repeatClients: 0,
    clientsDidntJoin: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    completedRevenue: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState<SessionFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch sessions from API
  const fetchSessions = useCallback(async (
    page = 1,
    limit = 10,
    currentFilters = filters,
    showRefreshing = false
  ) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'scheduledDate',
        sortOrder: 'desc',
        ...currentFilters,
      });

      const response = await sessionApi.getSessions({
        page,
        limit,
        sortBy: 'scheduledDate',
        sortOrder: 'desc',
        ...currentFilters,
      });

      setSessions(response.sessions);
      setPagination(response.pagination);

      // Calculate summary statistics
      const allSessions = response.sessions;
      const calculatedSummary = {
        totalSessions: allSessions.length,
        pendingSessions: allSessions.filter((s:any) => s.status === 'PENDING').length,
        completedSessions: allSessions.filter((s:any) => s.status === 'COMPLETED').length,
        cancelledSessions: allSessions.filter((s:any) => s.status === 'CANCELLED').length,
        abandonedSessions: allSessions.filter((s:any) => s.status === 'ABANDONED').length,
        repeatClients: allSessions.filter((s:any) => s.isRepeatClient).length,
        clientsDidntJoin: allSessions.filter((s:any) => s.status === 'NO_SHOW').length,
        totalRevenue: allSessions.reduce((sum:any, s:any) => sum + s.amount, 0),
        pendingRevenue: allSessions
          .filter((s:any) => s.paymentStatus === 'PENDING')
          .reduce((sum:any, s:any) => sum + s.amount, 0),
        completedRevenue: allSessions
          .filter((s:any) => s.paymentStatus === 'PAID')
          .reduce((sum: any, s:any) => sum + s.amount, 0),
      };

      setSummary(calculatedSummary);

      console.log('✅ Sessions loaded:', {
        count: allSessions.length,
        summary: calculatedSummary
      });

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to load sessions';
      console.error('❌ Error loading sessions:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  // Create new session
  const createSession = useCallback(async (sessionData: CreateSessionData): Promise<Session> => {
    try {
      setError(null);
      
      const newSession = await sessionApi.createSession(sessionData);
      
      // Update local state
      setSessions(prev => [newSession, ...prev]);
      setSummary(prev => ({
        ...prev,
        totalSessions: prev.totalSessions + 1,
        pendingSessions: prev.pendingSessions + 1,
        totalRevenue: prev.totalRevenue + newSession.amount,
        pendingRevenue: prev.pendingRevenue + newSession.amount,
      }));

      console.log('✅ Session created:', newSession.id);
      return newSession;

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to create session';
      console.error('❌ Error creating session:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Update session
  const updateSession = useCallback(async (
    sessionId: string, 
    updates: UpdateSessionData
  ): Promise<Session> => {
    try {
      setError(null);
      
      const updatedSession = await sessionApi.updateSession(sessionId, updates);
      
      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId ? updatedSession : session
      ));

      // Recalculate summary if status changed
      if (updates.status) {
        await fetchSessions(pagination.page, pagination.limit, filters, true);
      }

      console.log('✅ Session updated:', sessionId);
      return updatedSession;

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to update session';
      console.error('❌ Error updating session:', err);
      setError(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, filters, fetchSessions]);

  // Delete/cancel session
  const cancelSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setError(null);
      
      await sessionApi.cancelSession(sessionId);

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'CANCELLED' as const }
          : session
      ));

      // Recalculate summary
      await fetchSessions(pagination.page, pagination.limit, filters, true);

      console.log('✅ Session cancelled:', sessionId);

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to cancel session';
      console.error('❌ Error cancelling session:', err);
      setError(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, filters, fetchSessions]);

  // Bulk update sessions
  const bulkUpdateSessions = useCallback(async (
    sessionIds: string[],
    updates: { 
      status?: Session['status'];
      paymentStatus?: Session['paymentStatus'];
      consultantNotes?: string;
    }
  ): Promise<void> => {
    try {
      setError(null);
      
      await sessionApi.bulkUpdateSessions(sessionIds, updates);

      // Refresh sessions to get updated data
      await fetchSessions(pagination.page, pagination.limit, filters, true);

      console.log('✅ Bulk updated sessions:', sessionIds.length);

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to update sessions';
      console.error('❌ Error bulk updating sessions:', err);
      setError(errorMessage);
      throw err;
    }
  }, [pagination.page, pagination.limit, filters, fetchSessions]);

  // Change page
  const changePage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSessions(newPage, pagination.limit, filters);
    }
  }, [pagination.limit, pagination.totalPages, filters, fetchSessions]);

  // Change page size
  const changePageSize = useCallback((newLimit: number) => {
    fetchSessions(1, newLimit, filters);
  }, [filters, fetchSessions]);

  // Update filters
  const updateFilters = useCallback((newFilters: SessionFilters) => {
    setFilters(newFilters);
    fetchSessions(1, pagination.limit, newFilters);
  }, [pagination.limit, fetchSessions]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchSessions(pagination.page, pagination.limit, filters, true);
  }, [pagination.page, pagination.limit, filters, fetchSessions]);

  // Clear filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    fetchSessions(1, pagination.limit, clearedFilters);
  }, [pagination.limit, fetchSessions]);

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSessions(pagination.page, pagination.limit, filters, true);
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, pagination.page, pagination.limit, filters, fetchSessions]);

  return {
    // Data
    sessions,
    summary,
    pagination,
    filters,
    
    // State
    isLoading,
    isRefreshing,
    error,
    
    // Actions
    createSession,
    updateSession,
    cancelSession,
    bulkUpdateSessions,
    changePage,
    changePageSize,
    updateFilters,
    clearFilters,
    refresh,
    
    // Helpers
    formatCurrency: (amount: number) => `₹${amount.toLocaleString('en-IN')}`,
    formatDate: (dateString: string) => new Date(dateString).toLocaleDateString('en-IN'),
    formatDateTime: (dateString: string, timeString: string) => {
      const date = new Date(dateString).toLocaleDateString('en-IN');
      return `${date} at ${timeString}`;
    },
    getStatusColor: (status: Session['status']) => {
      switch (status) {
        case 'COMPLETED': return 'bg-green-100 text-green-800';
        case 'PENDING': return 'bg-orange-100 text-orange-800';
        case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
        case 'CANCELLED': return 'bg-red-100 text-red-800';
        case 'ABANDONED': return 'bg-gray-100 text-gray-800';
        case 'NO_SHOW': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    },
    getPaymentStatusColor: (status: Session['paymentStatus']) => {
      switch (status) {
        case 'PAID': return 'bg-green-100 text-green-800';
        case 'PENDING': return 'bg-orange-100 text-orange-800';
        case 'FAILED': return 'bg-red-100 text-red-800';
        case 'REFUNDED': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };
};

export default useSessions;