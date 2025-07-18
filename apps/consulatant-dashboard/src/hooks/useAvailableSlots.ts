// apps/consulatant-dashboard/src/hooks/useAvailableSlots.ts

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { availabilityApi, AvailabilitySlot } from '@/lib/api';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const INITIAL_DAYS_TO_FETCH = 14; // Start with 2 weeks

// Cache utility functions
const getCacheKey = (consultantSlug: string, sessionType: string) => 
  `availability_cache_${consultantSlug}_${sessionType}`;

const getCachedData = (cacheKey: string) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_TTL;
    
    if (isExpired) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setCachedData = (cacheKey: string, data: any) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to cache availability data:', error);
  }
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
      const cachedData = getCachedData(cacheKey);
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
      const cachedData = getCachedData(cacheKey);
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

      console.log('🔍 useAvailableSlots: API response:', {
        hasSlots: Array.isArray(response?.slots),
        slotsLength: response?.slots?.length || 0,
        hasSlotsByDate: typeof response?.slotsByDate === 'object',
        slotsByDateKeys: Object.keys(response?.slotsByDate || {}),
        totalSlots: response?.totalSlots
      });

      // Ensure we have valid data structure
      const slots = Array.isArray(response?.slots) ? response.slots : [];
      const slotsByDate = response?.slotsByDate && typeof response.slotsByDate === 'object' 
        ? response.slotsByDate 
        : {};

      console.log('🔍 useAvailableSlots: Processed data:', {
        slotsCount: slots.length,
        dateCount: Object.keys(slotsByDate).length,
        availableDates: Object.keys(slotsByDate)
      });

      // Cache the successful response
      const dataToCache = {
        slots,
        slotsByDate,
        timestamp: Date.now()
      };
      setCachedData(cacheKey, dataToCache);

      setSlots(slots);
      setSlotsByDate(slotsByDate);
      setCacheTimestamp(Date.now());
      setCurrentDaysLoaded(daysToFetch);
      setHasMore(daysToFetch < 60); // Allow loading up to 60 days max
    } catch (err) {
      console.error('❌ useAvailableSlots: Failed to fetch available slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to load availability');
      
      // Don't clear existing data on error if we have cached data
      const cachedData = getCachedData(cacheKey);
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
    return slotsForDate
      .map(slot => slot.startTime)
      .sort();
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
    hasMore
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