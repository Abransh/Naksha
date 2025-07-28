/**
 * Public Consultant Profile Hook
 * Handles fetching public consultant profile data for showcase pages
 */

import { useState, useEffect, useCallback } from 'react';
import { consultantApi, type PublicConsultantProfile } from '@/lib/api';

interface UsePublicProfileOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface PublicProfileState {
  profile: PublicConsultantProfile | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PublicProfileActions {
  refetch: () => Promise<void>;
  clearError: () => void;
}

export const usePublicProfile = (
  slug: string,
  options: UsePublicProfileOptions = {}
): PublicProfileState & PublicProfileActions => {
  const { enabled = true, refetchInterval } = options;
  
  const [profile, setProfile] = useState<PublicConsultantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!enabled || !slug) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const profileData = await consultantApi.getPublicProfile(slug);
      console.log('🔍 Public Profile Data:', profileData);
      console.log('🔍 Consultant Data:', profileData.consultant);
      console.log('🔍 Personal Session Description:', profileData.consultant?.personalSessionDescription);
      console.log('🔍 Webinar Session Description:', profileData.consultant?.webinarSessionDescription);
      setProfile(profileData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Failed to fetch public profile for slug: ${slug}`, err);
      setError(err instanceof Error ? err.message : 'Failed to load consultant profile');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, slug]);

  // Initial fetch when slug changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Set up automatic refetching if interval is provided
  useEffect(() => {
    if (!enabled || !refetchInterval || !slug) return;

    const interval = setInterval(() => {
      fetchProfile();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enabled, refetchInterval, fetchProfile, slug]);

  return {
    profile,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchProfile,
    clearError,
  };
};

// Helper hook for consultant showcase data
export const useConsultantShowcase = (slug: string) => {
  const { profile, isLoading, error, refetch } = usePublicProfile(slug);

  // Mock testimonials data (since it's not in the backend yet)
  const testimonials = [
    {
     
    },
    {
     
    },
    {
     
    },
  ];

  // Calculate ratings (mock data)
  const ratings = {
    average: 4.7,
    total: 24,
    distribution: {
      5: 18,
      4: 4,
      3: 2,
      2: 0,
      1: 0,
    }
  };

  // Format session services
  const services = profile ? [
    {
      id: 'personal',
      type: 'Personal Session',
      title: profile.consultant.personalSessionTitle || '1-on-1 Personal Session',
      description: profile.consultant.personalSessionDescription || 'Personalized consultation session',
      price: profile.consultant.personalSessionPrice || 200,
      currency: 'INR',
      available: true,
      rating: ratings.average,
      totalRatings: ratings.total,
    },
    {
      id: 'webinar',
      type: 'Webinar',
      title: profile.consultant.webinarSessionTitle || 'Group Webinar Session',
      description: profile.consultant.webinarSessionDescription || 'Group learning session',
      price: profile.consultant.webinarSessionPrice || 150,
      currency: 'INR',
      available: profile.availableSlots.some(slot => slot.sessionType === 'WEBINAR'),
      nextDate: profile.availableSlots
        .filter(slot => slot.sessionType === 'WEBINAR')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date,
    }
  ] : [];

  // Format social links
  const socialLinks = profile ? [
    {
      platform: 'LinkedIn',
      url: profile.consultant.linkedinUrl,
      icon: 'linkedin',
      available: Boolean(profile.consultant.linkedinUrl),
    },
    {
      platform: 'Instagram', 
      url: profile.consultant.instagramUrl,
      icon: 'instagram',
      available: Boolean(profile.consultant.instagramUrl),
    },
    {
      platform: 'X (Twitter)',
      url: profile.consultant.xUrl,
      icon: 'twitter',
      available: Boolean(profile.consultant.xUrl),
    },
  ].filter(link => link.available) : [];

  // Profile summary
  const summary = profile ? {
    name: `${profile.consultant.firstName} ${profile.consultant.lastName}`,
    bio: profile.consultant.description || 'Professional consultant',
    sector: profile.consultant.consultancySector || 'Consulting',
    experience: profile.consultant.experienceYears || 0,
    completedSessions: profile.consultant.stats.completedSessions || 0,
    profilePhoto: profile.consultant.profilePhotoUrl,
    verified: true, // Assuming verified if profile exists
    personalSessionDescription: profile.consultant.personalSessionDescription,
    webinarSessionDescription: profile.consultant.webinarSessionDescription,
  } : null;

  // Debug logging for summary
  if (summary) {
    console.log('🔍 Summary Created:', summary);
    console.log('🔍 Summary Personal Session Description:', summary.personalSessionDescription);
    console.log('🔍 Summary Webinar Session Description:', summary.webinarSessionDescription);
  }

  return {
    profile,
    summary,
    services,
    testimonials,
    ratings,
    socialLinks,
    availableSlots: profile?.availableSlots || [],
    isLoading,
    error,
    refetch,
  };
};

// Helper hook for booking availability
export const useAvailableSlots = (slug: string, sessionType?: 'PERSONAL' | 'WEBINAR') => {
  const { profile, isLoading, error } = usePublicProfile(slug);

  const slots = profile?.availableSlots || [];
  
  const filteredSlots = sessionType 
    ? slots.filter(slot => slot.sessionType === sessionType)
    : slots;

  // Group slots by date
  const slotsByDate = filteredSlots.reduce((acc, slot) => {
    const dateKey = slot.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, typeof filteredSlots>);

  // Get upcoming dates (next 30 days)
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  const upcomingSlots = filteredSlots.filter(slot => {
    const slotDate = new Date(slot.date);
    return slotDate >= today && slotDate <= next30Days;
  });

  return {
    allSlots: filteredSlots,
    slotsByDate,
    upcomingSlots,
    hasAvailability: filteredSlots.length > 0,
    nextAvailableDate: upcomingSlots[0]?.date,
    isLoading,
    error,
  };
};

// Helper hook for price formatting
export const usePriceFormatter = () => {
  const formatPrice = useCallback((price: number, currency: string = 'INR') => {
    const formatters = {
      INR: (amount: number) => `₹${amount.toLocaleString('en-IN')}`,
      USD: (amount: number) => `$${amount.toLocaleString('en-US')}`,
      EUR: (amount: number) => `€${amount.toLocaleString('en-EU')}`,
    };

    const formatter = formatters[currency as keyof typeof formatters] || formatters.INR;
    return formatter(price);
  }, []);

  const formatPriceRange = useCallback((minPrice: number, maxPrice?: number, currency: string = 'INR') => {
    if (!maxPrice || minPrice === maxPrice) {
      return formatPrice(minPrice, currency);
    }
    return `${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}`;
  }, [formatPrice]);

  return {
    formatPrice,
    formatPriceRange,
  };
};