// apps/consulatant-dashboard/src/hooks/useAvailableSlots.ts

import { useState, useEffect } from 'react';
import { availabilityApi, AvailabilitySlot } from '@/lib/api';

interface UseAvailableSlotsResult {
  slots: AvailabilitySlot[];
  slotsByDate: Record<string, AvailabilitySlot[]>;
  availableDates: string[];
  availableTimesForDate: (date: string) => string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch and manage available slots for a consultant
 * Used for client booking experience with real availability data
 */
export const useAvailableSlots = (
  consultantSlug: string, 
  sessionType: 'PERSONAL' | 'WEBINAR'
): UseAvailableSlotsResult => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, AvailabilitySlot[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSlots = async () => {
    if (!consultantSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get next 60 days of availability
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 60);

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await availabilityApi.getAvailableSlots(consultantSlug, {
        sessionType,
        startDate: startDateStr,
        endDate: endDateStr
      });

      setSlots(response.slots);
      setSlotsByDate(response.slotsByDate);
    } catch (err) {
      console.error('Failed to fetch available slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to load availability');
      setSlots([]);
      setSlotsByDate({});
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch slots when consultant or session type changes
  useEffect(() => {
    fetchAvailableSlots();
  }, [consultantSlug, sessionType]);

  // Get available dates (dates that have at least one slot)
  const availableDates = Object.keys(slotsByDate).sort();

  // Get available times for a specific date
  const availableTimesForDate = (date: string): string[] => {
    const slotsForDate = slotsByDate[date] || [];
    return slotsForDate
      .map(slot => slot.startTime)
      .sort();
  };

  return {
    slots,
    slotsByDate,
    availableDates,
    availableTimesForDate,
    isLoading,
    error,
    refetch: fetchAvailableSlots
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