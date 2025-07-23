// apps/consulatant-dashboard/src/hooks/useAvailableSlots.ts

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { availabilityApi, AvailabilitySlot } from '@/lib/api';
import { setupCacheInvalidationListener, isCacheStale, type CacheInvalidationEvent } from '@/lib/cacheInvalidation';

// UNIFIED CACHE TTL STRATEGY
// Aligned with backend cache timing for consistency
const CACHE_TTL = 1 * 60 * 1000; // 1 minute - matches backend SLOTS TTL
const INITIAL_DAYS_TO_FETCH = 14; // Start with 2 weeks

// Cache utility functions
const getCacheKey = (consultantSlug: string, sessionType: string) => 
  `availability_cache_${consultantSlug}_${sessionType}`;

const getCachedData = (cacheKey: string, consultantSlug: string) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      console.log('📋 Cache miss for key:', cacheKey);
      return null;
    }
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache is expired by TTL
    const isExpiredByTTL = Date.now() - timestamp > CACHE_TTL;
    
    // Check if cache is stale due to invalidation events
    const isStaleByInvalidation = isCacheStale(consultantSlug, timestamp);
    
    if (isExpiredByTTL || isStaleByInvalidation) {
      const reason = isExpiredByTTL ? 'TTL expired' : 'invalidated by event';
      console.log(`⏰ Cache ${reason} for key:`, cacheKey, 'Age:', Math.round((Date.now() - timestamp) / 1000), 'seconds');
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('✅ Cache hit for key:', cacheKey, 'Age:', Math.round((Date.now() - timestamp) / 1000), 'seconds');
    return data;
  } catch (error) {
    console.warn('❌ Cache error for key:', cacheKey, error);
    return null;
  }
};

const setCachedData = (cacheKey: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('📋 Data cached successfully:', cacheKey, 'Data size:', JSON.stringify(cacheData).length, 'bytes');
  } catch (error) {
    console.warn('❌ Failed to cache availability data:', cacheKey, error);
  }
};

const clearAllAvailabilityCache = (consultantSlug: string) => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`availability_cache_${consultantSlug}_`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🧹 Cleared cache key:', key);
    });
    
    console.log('✅ Cleared all availability cache for consultant:', consultantSlug, 'Keys removed:', keysToRemove.length);
  } catch (error) {
    console.warn('❌ Failed to clear availability cache:', error);
  }
};

/**
 * UNIFIED CACHE INVALIDATION
 * Clear availability cache across all session types when patterns change
 */
const invalidateAvailabilityCache = (consultantSlug: string) => {
  console.log('🔄 Invalidating availability cache for consultant:', consultantSlug);
  
  // Clear all session type caches for this consultant
  ['PERSONAL', 'WEBINAR'].forEach(sessionType => {
    const cacheKey = getCacheKey(consultantSlug, sessionType);
    try {
      localStorage.removeItem(cacheKey);
      console.log('🗑️ Invalidated cache for:', sessionType);
    } catch (error) {
      console.warn('⚠️ Failed to invalidate cache for:', sessionType, error);
    }
  });
  
  // REAL-TIME CACHE INVALIDATION: Broadcast cache invalidation event
  if (typeof window !== 'undefined') {
    const invalidationEvent = new CustomEvent('availability-cache-invalidated', {
      detail: { consultantSlug, timestamp: Date.now() }
    });
    window.dispatchEvent(invalidationEvent);
    console.log('📡 Broadcasted cache invalidation event');
  }
  
  console.log('✅ Availability cache invalidation completed');
};

interface UseAvailableSlotsResult {
  slots: AvailabilitySlot[];
  slotsByDate: Record<string, AvailabilitySlot[]>;
  availableDates: string[];
  availableTimesForDate: (date: string) => string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  triggerFetch: (daysToFetch?: number) => Promise<void>;
  isCached: boolean;
  cacheTimestamp: number | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  clearCache: () => void;
  invalidateCache: () => void;
}

/**
 * Custom hook to fetch and manage available slots for a consultant
 * Now supports lazy loading with optional auto-fetch
 */
export const useAvailableSlots = (
  consultantSlug: string, 
  sessionType: 'PERSONAL' | 'WEBINAR',
  autoFetch: boolean = true // NEW: Control auto-fetching
): UseAvailableSlotsResult => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, AvailabilitySlot[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [currentDaysLoaded, setCurrentDaysLoaded] = useState(INITIAL_DAYS_TO_FETCH);
  const [hasMore, setHasMore] = useState(true);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheKey = useMemo(() => getCacheKey(consultantSlug, sessionType), [consultantSlug, sessionType]);
  
  // Load from cache on init if available
  useEffect(() => {
    if (consultantSlug && sessionType) {
      const cachedData = getCachedData(cacheKey, consultantSlug);
      if (cachedData) {
        console.log('🎯 useAvailableSlots: Loading cached data on init');
        setSlots(cachedData.slots || []);
        setSlotsByDate(cachedData.slotsByDate || {});
        setIsCached(true);
        setCacheTimestamp(cachedData.timestamp || Date.now());
      }
    }
  }, [consultantSlug, sessionType, cacheKey]);

  // Timeout protection for loading states
  useEffect(() => {
    if (isLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        console.warn('⚠️ useAvailableSlots: Loading timeout reached');
        setIsLoading(false);
        setError('Loading timeout - please try again');
      }, 10000); // 10 second timeout

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [isLoading]);

  const fetchAvailableSlots = useCallback(async (daysToFetch = currentDaysLoaded, fromCache = true) => {
    if (!consultantSlug) {
      console.log('🔍 useAvailableSlots: No consultantSlug provided, skipping fetch');
      return;
    }

    // Check cache first if enabled
    if (fromCache) {
      const cachedData = getCachedData(cacheKey, consultantSlug);
      if (cachedData) {
        console.log('🎯 useAvailableSlots: Using cached data');
        setSlots(cachedData.slots || []);
        setSlotsByDate(cachedData.slotsByDate || {});
        setIsCached(true);
        setCacheTimestamp(cachedData.timestamp || Date.now());
        setError(null);
        return;
      }
    }

    // Prevent multiple simultaneous calls
    if (isLoading) {
      console.log('🔍 useAvailableSlots: Already loading, skipping duplicate fetch');
      return;
    }

    console.log('🔍 useAvailableSlots: Starting fetch for:', { 
      consultantSlug, 
      sessionType,
      daysToFetch
    });
    
    setIsLoading(true);
    setError(null);
    setIsCached(false);

    try {
      // Calculate date range
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + daysToFetch);

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log('🔍 useAvailableSlots: Fetching with params:', {
        consultantSlug,
        sessionType,
        startDate: startDateStr,
        endDate: endDateStr,
        daysRequested: daysToFetch
      });

      const response = await availabilityApi.getAvailableSlots(consultantSlug, {
        sessionType,
        startDate: startDateStr,
        endDate: endDateStr
      });

      console.log('🔍 useAvailableSlots: Raw API response:', {
        consultantSlug,
        sessionType,
        dateRange: `${startDateStr} to ${endDateStr}`,
        hasSlots: Array.isArray(response?.slots),
        slotsLength: response?.slots?.length || 0,
        hasSlotsByDate: typeof response?.slotsByDate === 'object',
        slotsByDateKeys: Object.keys(response?.slotsByDate || {}),
        totalSlots: response?.totalSlots,
        rawResponse: response
      });

      // Log detailed slot breakdown
      if (response?.slotsByDate) {
        console.log('📊 useAvailableSlots: Detailed slots by date:', 
          Object.entries(response.slotsByDate).map(([date, slots]) => ({
            date,
            slotsCount: Array.isArray(slots) ? slots.length : 0,
            timeSlots: Array.isArray(slots) ? slots.map((s: any) => `${s.startTime}-${s.endTime}`) : []
          }))
        );
      }

      // Ensure we have valid data structure
      const slots = Array.isArray(response?.slots) ? response.slots : [];
      const slotsByDate = response?.slotsByDate && typeof response.slotsByDate === 'object' 
        ? response.slotsByDate 
        : {};

      console.log('🔍 useAvailableSlots: Processed data before state update:', {
        slotsCount: slots.length,
        dateCount: Object.keys(slotsByDate).length,
        availableDates: Object.keys(slotsByDate),
        processedSlots: slots.slice(0, 5).map(slot => ({
          date: slot.date,
          time: `${slot.startTime}-${slot.endTime}`,
          type: slot.sessionType
        }))
      });

      // Cache the successful response
      const dataToCache = {
        slots,
        slotsByDate,
        timestamp: Date.now()
      };
      setCachedData(cacheKey, dataToCache);

      // Update component state
      setSlots(slots);
      setSlotsByDate(slotsByDate);
      setCacheTimestamp(Date.now());
      setCurrentDaysLoaded(daysToFetch);
      setHasMore(daysToFetch < 60); // Allow loading up to 60 days max

      console.log('✅ useAvailableSlots: State updated successfully:', {
        slotsInState: slots.length,
        datesInState: Object.keys(slotsByDate).length,
        cacheTimestamp: Date.now(),
        hasMore: daysToFetch < 60
      });
    } catch (err) {
      console.error('❌ useAvailableSlots: Failed to fetch available slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to load availability');
      
      // Don't clear existing data on error if we have cached data
      const cachedData = getCachedData(cacheKey, consultantSlug);
      if (!cachedData) {
        setSlots([]);
        setSlotsByDate({});
      }
    } finally {
      console.log('🔍 useAvailableSlots: Fetch complete, setting loading to false');
      setIsLoading(false);
      
      // Clear timeout since fetch completed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [consultantSlug, sessionType, cacheKey, currentDaysLoaded, isLoading]);

  // NEW: Manual trigger fetch method
  const triggerFetch = useCallback(async (daysToFetch?: number) => {
    console.log('🎯 useAvailableSlots: Manual fetch triggered');
    await fetchAvailableSlots(daysToFetch || currentDaysLoaded, false);
  }, [fetchAvailableSlots, currentDaysLoaded]);

  // Load more data function for pagination
  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      const newDaysToFetch = Math.min(currentDaysLoaded + 14, 60);
      await fetchAvailableSlots(newDaysToFetch, false);
    }
  }, [hasMore, isLoading, currentDaysLoaded, fetchAvailableSlots]);

  // COMPREHENSIVE REAL-TIME SYNCHRONIZATION: Enhanced cache invalidation with backend alignment
  useEffect(() => {
    if (!consultantSlug) return;

    const handleCacheInvalidation = (event: CacheInvalidationEvent) => {
      console.log('📡 COMPREHENSIVE SYNC: Received cache invalidation event from backend-aligned system:', event);
      console.log('🔧 Event details:', {
        eventType: event.type,
        consultantSlug: event.consultantSlug,
        sessionType: event.sessionType,
        timestamp: event.timestamp,
        source: event.source,
        currentSessionType: sessionType,
        componentAutoFetch: autoFetch
      });
      
      // Clear local component cache immediately
      localStorage.removeItem(cacheKey);
      console.log('🗑️ IMMEDIATE: Component cache cleared after backend synchronization event');
      
      // Force refresh if component is actively being used AND event is relevant
      const isRelevantEvent = !event.sessionType || event.sessionType === sessionType;
      
      if (autoFetch && isRelevantEvent) {
        console.log('🔄 FORCE REFRESH: Backend-triggered data refresh starting');
        console.log('📊 Refresh context:', {
          reason: 'backend_synchronization_event',
          eventSource: event.source,
          daysToLoad: currentDaysLoaded,
          consultantSlug,
          sessionType
        });
        
        // Add small delay to ensure backend caches are cleared
        setTimeout(() => {
          fetchAvailableSlots(currentDaysLoaded, false);
          console.log('✅ COMPREHENSIVE SYNC: Data refresh completed, all components synchronized');
        }, 100);
      } else {
        console.log('⏭️ DEFERRED REFRESH: Component not active or event not relevant, will refresh on next interaction');
      }
    };

    const cleanup = setupCacheInvalidationListener(consultantSlug, handleCacheInvalidation);
    
    return cleanup;
  }, [consultantSlug, cacheKey, autoFetch, fetchAvailableSlots, currentDaysLoaded, sessionType]);

  // Auto-fetch when consultant or session type changes (only if autoFetch is true)
  useEffect(() => {
    console.log('🔄 useAvailableSlots: useEffect triggered', { 
      consultantSlug, 
      sessionType, 
      autoFetch 
    });
    
    if (consultantSlug && sessionType && autoFetch) {
      // Reset state for new consultant/session type
      setCurrentDaysLoaded(INITIAL_DAYS_TO_FETCH);
      setHasMore(true);
      fetchAvailableSlots();
    }
  }, [consultantSlug, sessionType, autoFetch, fetchAvailableSlots]);

  // Get available dates (dates that have at least one slot)
  const availableDates = Object.keys(slotsByDate).sort();

  // Get available times for a specific date
  const availableTimesForDate = (date: string): string[] => {
    const slotsForDate = slotsByDate[date] || [];
    const times = slotsForDate
      .map(slot => slot.startTime)
      .sort();
    
    console.log('🕐 useAvailableSlots: Getting times for date:', {
      date,
      slotsFound: slotsForDate.length,
      timesExtracted: times,
      fullSlots: slotsForDate.map(slot => ({
        id: slot.id,
        time: `${slot.startTime}-${slot.endTime}`,
        type: slot.sessionType
      }))
    });
    
    return times;
  };

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    slots,
    slotsByDate,
    availableDates,
    availableTimesForDate,
    isLoading,
    error,
    refetch: () => fetchAvailableSlots(currentDaysLoaded, false),
    triggerFetch, // NEW: Manual trigger method
    isCached,
    cacheTimestamp,
    loadMore,
    hasMore,
    clearCache: () => clearAllAvailabilityCache(consultantSlug), // Clear all cache
    invalidateCache: () => invalidateAvailabilityCache(consultantSlug) // Unified cache invalidation
  };
};

/**
 * Hook to format availability data for UI display
 */
export const useAvailabilityFormatter = () => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  return {
    formatDate,
    formatTime,
    formatTimeRange
  };
};