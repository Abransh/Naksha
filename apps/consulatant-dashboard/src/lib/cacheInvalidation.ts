/**
 * REAL-TIME CACHE INVALIDATION SYSTEM
 * 
 * Provides centralized cache invalidation for availability system
 * Ensures all components receive real-time updates when data changes
 */

// Cache invalidation event types
export type CacheInvalidationEvent = {
  type: 'availability-patterns-updated' | 'availability-slots-updated' | 'general-availability-update';
  consultantSlug: string;
  sessionType?: 'PERSONAL' | 'WEBINAR';
  timestamp: number;
  source: string; // Which component triggered the invalidation
};

/**
 * 
 * Broadcast cache invalidation event to all listening components
 */
export const broadcastCacheInvalidation = (event: CacheInvalidationEvent) => {
  if (typeof window === 'undefined') return;

  console.log('📡 Broadcasting cache invalidation event:', event);

  // Dispatch custom event for real-time invalidation
  const customEvent = new CustomEvent('availability-cache-invalidated', {
    detail: event
  });
  
  window.dispatchEvent(customEvent);

  // Also store last invalidation timestamp for components that missed the event
  const storageKey = `cache_invalidation_${event.consultantSlug}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      timestamp: event.timestamp,
      type: event.type,
      sessionType: event.sessionType
    }));
  } catch (error) {
    console.warn('⚠️ Failed to store invalidation timestamp:', error);
  }

  console.log('✅ Cache invalidation event broadcasted');
};

/**
 * Get last cache invalidation timestamp for a consultant
 */
export const getLastInvalidationTimestamp = (consultantSlug: string): number => {
  if (typeof window === 'undefined') return 0;

  const storageKey = `cache_invalidation_${consultantSlug}`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const data = JSON.parse(stored);
      return data.timestamp || 0;
    }
  } catch (error) {
    console.warn('⚠️ Failed to get invalidation timestamp:', error);
  }
  
  return 0;
};

/**
 * Check if cached data is stale based on last invalidation
 */
export const isCacheStale = (consultantSlug: string, cacheTimestamp: number): boolean => {
  const lastInvalidation = getLastInvalidationTimestamp(consultantSlug);
  return lastInvalidation > cacheTimestamp;
};

/**
 * Setup cache invalidation listener for a component
 */
export const setupCacheInvalidationListener = (
  consultantSlug: string,
  onInvalidation: (event: CacheInvalidationEvent) => void
): () => void => {
  if (typeof window === 'undefined') return () => {};

  const handleInvalidation = (event: CustomEvent<CacheInvalidationEvent>) => {
    const { consultantSlug: eventConsultantSlug } = event.detail;
    
    if (eventConsultantSlug === consultantSlug) {
      console.log('📡 Component received cache invalidation event:', event.detail);
      onInvalidation(event.detail);
    }
  };

  window.addEventListener('availability-cache-invalidated', handleInvalidation as EventListener);
  
  return () => {
    window.removeEventListener('availability-cache-invalidated', handleInvalidation as EventListener);
  };
};

/**
 * CONVENIENCE FUNCTIONS for common invalidation scenarios
 */

export const invalidateAvailabilityPatterns = (consultantSlug: string, source: string = 'unknown') => {
  broadcastCacheInvalidation({
    type: 'availability-patterns-updated',
    consultantSlug,
    timestamp: Date.now(),
    source
  });
};

export const invalidateAvailabilitySlots = (
  consultantSlug: string, 
  sessionType?: 'PERSONAL' | 'WEBINAR',
  source: string = 'unknown'
) => {
  broadcastCacheInvalidation({
    type: 'availability-slots-updated',
    consultantSlug,
    sessionType,
    timestamp: Date.now(),
    source
  });
};

export const invalidateAllAvailability = (consultantSlug: string, source: string = 'unknown') => {
  broadcastCacheInvalidation({
    type: 'general-availability-update',
    consultantSlug,
    timestamp: Date.now(),
    source
  });
};