/**
 * Teams Auto-Refresh Hook
 * Automatically manages Microsoft Teams token refresh to provide seamless user experience
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface TeamsStatus {
  isConnected: boolean;
  isExpired: boolean;
  timeUntilExpiry?: number | null;
  tokenHealth?: 'good' | 'warning' | 'expired' | 'refresh-needed' | null;
  shouldAutoRefresh?: boolean;
  hasRefreshToken?: boolean;
}

interface UseTeamsAutoRefreshProps {
  status: TeamsStatus | null;
  onStatusChange?: () => void;
  enabled?: boolean;
}

export const useTeamsAutoRefresh = ({ 
  status, 
  onStatusChange, 
  enabled = true 
}: UseTeamsAutoRefreshProps) => {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshAttempt = useRef<number>(0);

  // Minimum time between refresh attempts (5 minutes)
  const MIN_REFRESH_INTERVAL = 5 * 60 * 1000;

  // Auto-refresh token when it has 30+ minutes remaining
  const AUTO_REFRESH_THRESHOLD = 30 * 60; // 30 minutes in seconds

  // Clear any existing timeout
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Perform token refresh
  const performRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('🔄 [TEAMS AUTO-REFRESH] Already refreshing, skipping...');
      return;
    }

    // Rate limiting: don't refresh more than once every 5 minutes
    const now = Date.now();
    if (now - lastRefreshAttempt.current < MIN_REFRESH_INTERVAL) {
      console.log('🔄 [TEAMS AUTO-REFRESH] Rate limited, skipping refresh');
      return;
    }

    try {
      isRefreshingRef.current = true;
      lastRefreshAttempt.current = now;

      console.log('🔄 [TEAMS AUTO-REFRESH] Starting automatic token refresh...');

      // Import API client dynamically to avoid SSR issues
      const { consultantApi } = await import('@/lib/api');
      await consultantApi.teams.refreshToken();

      console.log('✅ [TEAMS AUTO-REFRESH] Token refreshed successfully');

      // Trigger status update
      if (onStatusChange) {
        setTimeout(onStatusChange, 1000); // Small delay to ensure backend update
      }

    } catch (error) {
      console.error('❌ [TEAMS AUTO-REFRESH] Token refresh failed:', error);
      
      // Only show error toast if it's a critical failure, not rate limiting
      if (error instanceof Error && !error.message.includes('rate limit')) {
        // Don't show user-facing errors for auto-refresh failures
        // The user will only see issues when they actually try to use Teams
        console.log('🔕 [TEAMS AUTO-REFRESH] Silent failure - user will be prompted if Teams is needed');
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onStatusChange]);

  // Schedule next refresh based on token status
  const scheduleRefresh = useCallback((timeUntilExpiry: number) => {
    clearRefreshTimeout();

    if (!enabled || !status?.isConnected) {
      return;
    }

    let refreshInSeconds: number;

    if (timeUntilExpiry <= 0) {
      // Token already expired, try refresh immediately
      refreshInSeconds = 5; // 5 seconds delay
    } else if (timeUntilExpiry <= AUTO_REFRESH_THRESHOLD) {
      // Token expiring soon, refresh now
      refreshInSeconds = 10; // 10 seconds delay
    } else {
      // Schedule refresh for when token has 30 minutes left
      refreshInSeconds = timeUntilExpiry - AUTO_REFRESH_THRESHOLD;
    }

    // Don't schedule refresh more than 24 hours in advance
    const maxScheduleTime = 24 * 60 * 60; // 24 hours
    refreshInSeconds = Math.min(refreshInSeconds, maxScheduleTime);

    console.log(`⏰ [TEAMS AUTO-REFRESH] Scheduling refresh in ${refreshInSeconds} seconds (${Math.round(refreshInSeconds / 60)} minutes)`);

    refreshTimeoutRef.current = setTimeout(() => {
      performRefresh();
    }, refreshInSeconds * 1000);
  }, [enabled, status?.isConnected, performRefresh, clearRefreshTimeout]);

  // Handle visibility change (user focuses app)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && enabled && status?.isConnected) {
      console.log('👀 [TEAMS AUTO-REFRESH] App focused, checking token status...');
      
      // Check if token needs refresh when app becomes visible
      if (status.timeUntilExpiry !== null && status.timeUntilExpiry !== undefined) {
        if (status.timeUntilExpiry <= AUTO_REFRESH_THRESHOLD) {
          console.log('🔄 [TEAMS AUTO-REFRESH] Token needs refresh after app focus');
          performRefresh();
        }
      }
    }
  }, [enabled, status, performRefresh]);

  // Set up auto-refresh based on token status
  useEffect(() => {
    if (!enabled || !status) {
      clearRefreshTimeout();
      return;
    }

    if (!status.isConnected) {
      clearRefreshTimeout();
      return;
    }

    // If token is truly expired (not just needs refresh), don't auto-refresh
    // Let the user manually reconnect for security
    if (status.tokenHealth === 'expired') {
      clearRefreshTimeout();
      return;
    }

    // If token needs refresh or is expired but has refresh token, try auto-refresh
    if (status.tokenHealth === 'refresh-needed' || status.shouldAutoRefresh) {
      console.log('🔄 [TEAMS AUTO-REFRESH] Token needs immediate refresh');
      performRefresh();
      return;
    }

    // Schedule refresh based on time until expiry
    if (status.timeUntilExpiry !== null && status.timeUntilExpiry !== undefined) {
      scheduleRefresh(status.timeUntilExpiry);
    }

    return () => {
      clearRefreshTimeout();
    };
  }, [enabled, status, scheduleRefresh, clearRefreshTimeout]);

  // Set up visibility change listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleVisibilityChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRefreshTimeout();
    };
  }, [clearRefreshTimeout]);

  // Manual refresh function (for emergency use)
  const manualRefresh = useCallback(async () => {
    if (!status?.isConnected) {
      console.log('❌ [TEAMS AUTO-REFRESH] Cannot manually refresh - not connected');
      return false;
    }

    try {
      await performRefresh();
      return true;
    } catch (error) {
      console.error('❌ [TEAMS AUTO-REFRESH] Manual refresh failed:', error);
      return false;
    }
  }, [status?.isConnected, performRefresh]);

  return {
    manualRefresh,
    isAutoRefreshEnabled: enabled && status?.isConnected && !status?.isExpired,
    isRefreshing: isRefreshingRef.current
  };
};

export default useTeamsAutoRefresh;