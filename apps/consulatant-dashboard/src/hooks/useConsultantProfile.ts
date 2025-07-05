/**
 * Consultant Profile Management Hook
 * Handles fetching, updating, and caching of consultant profile data for settings page
 */

import { useState, useEffect, useCallback } from 'react';
import { consultantApi, type ConsultantProfile, type UpdateProfileData } from '@/lib/api';

interface UseConsultantProfileOptions {
  enabled?: boolean;
}

interface ConsultantProfileState {
  profile: ConsultantProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isDirty: boolean;
}

interface ConsultantProfileActions {
  refetch: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<ConsultantProfile | null>;
  uploadPhoto: (file: File) => Promise<string | null>;
  checkSlugAvailability: (slug: string) => Promise<{ available: boolean; slug: string } | null>;
  clearError: () => void;
  markClean: () => void;
  markDirty: () => void;
}

export const useConsultantProfile = (
  options: UseConsultantProfileOptions = {}
): ConsultantProfileState & ConsultantProfileActions => {
  const { enabled = true } = options;
  
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const profileData = await consultantApi.getProfile();
      setProfile(profileData);
      setLastUpdated(new Date());
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to fetch consultant profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<ConsultantProfile | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const updatedProfile = await consultantApi.updateProfile(data);
      setProfile(updatedProfile);
      setLastUpdated(new Date());
      setIsDirty(false);
      
      return updatedProfile;
    } catch (err) {
      console.error('Failed to update consultant profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const uploadPhoto = useCallback(async (file: File): Promise<string | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const { profilePhotoUrl } = await consultantApi.uploadPhoto(file);
      
      // Update the profile with new photo URL
      if (profile) {
        const updatedProfile = { ...profile, profilePhotoUrl };
        setProfile(updatedProfile);
        setLastUpdated(new Date());
      }
      
      return profilePhotoUrl;
    } catch (err) {
      console.error('Failed to upload profile photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [profile]);

  const checkSlugAvailability = useCallback(async (
    slug: string
  ): Promise<{ available: boolean; slug: string } | null> => {
    try {
      setError(null);
      return await consultantApi.checkSlugAvailability(slug);
    } catch (err) {
      console.error('Failed to check slug availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to check slug availability');
      return null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isSaving,
    error,
    lastUpdated,
    isDirty,
    refetch: fetchProfile,
    updateProfile,
    uploadPhoto,
    checkSlugAvailability,
    clearError,
    markClean,
    markDirty,
  };
};

// Helper hook for settings form data
export const useSettingsForm = () => {
  const {
    profile,
    isLoading,
    isSaving,
    error,
    updateProfile,
    uploadPhoto,
    markDirty,
    clearError
  } = useConsultantProfile();

  const [formData, setFormData] = useState<UpdateProfileData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const initialData: UpdateProfileData = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phoneCountryCode: profile.phoneCountryCode || '+91',
        phoneNumber: profile.phoneNumber || '',
        consultancySector: profile.consultancySector || '',
        bankName: profile.bankName || '',
        accountNumber: profile.accountNumber || '',
        ifscCode: profile.ifscCode || '',
        personalSessionTitle: profile.personalSessionTitle || '',
        personalSessionDescription: profile.personalSessionDescription || '',
        webinarSessionTitle: profile.webinarSessionTitle || '',
        webinarSessionDescription: profile.webinarSessionDescription || '',
        description: profile.description || '',
        experienceMonths: profile.experienceMonths || 0,
        personalSessionPrice: profile.personalSessionPrice || 0,
        webinarSessionPrice: profile.webinarSessionPrice || 0,
        instagramUrl: profile.instagramUrl || '',
        linkedinUrl: profile.linkedinUrl || '',
        xUrl: profile.xUrl || '',
        slug: profile.slug || '',
      };
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [profile]);

  const updateFormData = useCallback((field: keyof UpdateProfileData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      setHasChanges(true);
      markDirty();
      return updated;
    });
  }, [markDirty]);

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!hasChanges) return true;

    // Clean the form data - remove empty strings and null values
    const cleanedData: Partial<UpdateProfileData> = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        // Convert numeric fields from strings to numbers if needed
        if (key === 'experienceMonths' && typeof value === 'string') {
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue)) {
            (cleanedData as any)[key] = numValue;
          }
        } else if ((key === 'personalSessionPrice' || key === 'webinarSessionPrice') && typeof value === 'string') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && numValue > 0) {
            (cleanedData as any)[key] = numValue;
          }
        } else {
          (cleanedData as any)[key] = value;
        }
      }
    });

    console.log('🔍 Frontend: Submitting cleaned form data:', cleanedData);
    console.log('🔍 Frontend: Original form data:', formData);

    const result = await updateProfile(cleanedData);
    if (result) {
      setHasChanges(false);
      return true;
    }
    return false;
  }, [formData, hasChanges, updateProfile]);

  const resetForm = useCallback(() => {
    if (profile) {
      const resetData: UpdateProfileData = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phoneCountryCode: profile.phoneCountryCode || '+91',
        phoneNumber: profile.phoneNumber || '',
        consultancySector: profile.consultancySector || '',
        bankName: profile.bankName || '',
        accountNumber: profile.accountNumber || '',
        ifscCode: profile.ifscCode || '',
        personalSessionTitle: profile.personalSessionTitle || '',
        webinarSessionTitle: profile.webinarSessionTitle || '',
        description: profile.description || '',
        experienceMonths: profile.experienceMonths || 0,
        personalSessionPrice: profile.personalSessionPrice || 0,
        webinarSessionPrice: profile.webinarSessionPrice || 0,
        instagramUrl: profile.instagramUrl || '',
        linkedinUrl: profile.linkedinUrl || '',
        xUrl: profile.xUrl || '',
        slug: profile.slug || '',
      };
      setFormData(resetData);
      setHasChanges(false);
    }
  }, [profile]);

  return {
    profile,
    formData,
    hasChanges,
    isLoading,
    isSaving,
    error,
    updateFormData,
    handleSubmit,
    resetForm,
    uploadPhoto,
    clearError,
  };
};

// Helper hook for profile completion status
export const useProfileCompletion = () => {
  const { profile } = useConsultantProfile();

  const completionStatus = {
    basicInfo: Boolean(
      profile?.firstName &&
      profile?.lastName &&
      profile?.phoneNumber &&
      profile?.email
    ),
    bankingInfo: Boolean(
      profile?.bankName &&
      profile?.accountNumber &&
      profile?.ifscCode
    ),
    sessionConfig: Boolean(
      profile?.personalSessionTitle &&
      profile?.personalSessionPrice &&
      profile?.description
    ),
    socialLinks: Boolean(
      profile?.instagramUrl ||
      profile?.linkedinUrl ||
      profile?.xUrl
    ),
    profilePhoto: Boolean(profile?.profilePhotoUrl)
  };

  const completedSections = Object.values(completionStatus).filter(Boolean).length;
  const totalSections = Object.keys(completionStatus).length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);
  const isComplete = completedSections === totalSections;

  return {
    ...completionStatus,
    completedSections,
    totalSections,
    completionPercentage,
    isComplete,
    profile
  };
};