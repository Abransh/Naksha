/**
 * Dashboard Data Hook
 * Handles fetching and caching of dashboard data
 */

import { useState, useEffect } from 'react';
import { dashboardApi, type DashboardOverview, type DashboardStats } from '@/lib/api';

interface UseDashboardOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

interface DashboardData {
  overview: DashboardOverview | null;
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useDashboard = (options: UseDashboardOptions = {}): DashboardData => {
  const { refetchInterval = 60000, enabled = true } = options; // Default: refetch every minute
  
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch both overview and stats in parallel for better performance
      const [overviewData, statsData] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getStats().catch((err) => {
          // If stats fail, continue with overview only
          console.warn('Dashboard stats failed to load:', err);
          return null;
        })
      ]);

      setOverview(overviewData);
      setStats(statsData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [enabled]);

  // Set up automatic refetching
  useEffect(() => {
    if (!enabled || !refetchInterval) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enabled, refetchInterval]);

  return {
    overview,
    stats,
    isLoading,
    error,
    refetch: fetchDashboardData,
    lastUpdated
  };
};

// Helper hook for individual dashboard metrics
export const useDashboardMetrics = () => {
  const { overview, isLoading, error } = useDashboard();
  
  return {
    revenue: overview?.revenue || { amount: 0, change: 0, withdrawn: 0 },
    clients: overview?.clients || { total: 0, change: 0, quotationsShared: 0, quotationChange: 0 },
    sessions: overview?.sessions || { all: 0, pending: 0, completed: 0, change: 0, abandonedPercentage: 0 },
    services: overview?.services || { all: 0, active: 0, change: 0 },
    revenueSplit: overview?.revenueSplit || { fromNaksha: 0, manuallyAdded: 0, total: 0 },
    recentSessions: overview?.recentSessions || [],
    chartData: overview?.chartData || [],
    metrics: overview?.metrics || { totalRevenue: 0, totalClients: 0, totalSessions: 0, completionRate: 0, averageSessionValue: 0 },
    isLoading,
    error
  };
};

// Helper hook for recent sessions
export const useRecentSessions = () => {
  const { overview, isLoading, error } = useDashboard();
  
  return {
    sessions: overview?.recentSessions || [],
    hasData: Boolean(overview?.recentSessions?.length),
    isLoading,
    error
  };
};

// Helper hook for revenue chart data
export const useRevenueChart = () => {
  const { overview, isLoading, error } = useDashboard();
  
  return {
    chartData: overview?.chartData || [],
    revenueSplit: overview?.revenueSplit || { fromNaksha: 0, manuallyAdded: 0, total: 0 },
    hasData: Boolean(overview?.chartData?.length),
    isLoading,
    error
  };
};