/**
 * Review Management Hook
 * Handles review submission and fetching for consultant profiles
 */

import { useState, useEffect, useCallback } from 'react';
import { reviewApi, ApiError, Review, ReviewSummary, CreateReviewData } from '@/lib/api';

interface UseReviewsOptions {
  consultantSlug: string;
  autoFetch?: boolean;
}

export const useReviews = ({ consultantSlug, autoFetch = true }: UseReviewsOptions) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reviews and summary for the consultant
  const fetchReviews = useCallback(async () => {
    if (!consultantSlug) return;
    
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching reviews for consultant:', consultantSlug);

      // Fetch both reviews and summary in parallel
      const [reviewsResponse, summaryResponse] = await Promise.all([
        reviewApi.getReviews(consultantSlug, { 
          status: 'APPROVED',
          limit: 50,
          offset: 0 
        }),
        reviewApi.getReviewSummary(consultantSlug)
      ]);

      setReviews(reviewsResponse.reviews);
      setReviewSummary(summaryResponse);

      console.log('✅ Reviews fetched successfully:', {
        reviewCount: reviewsResponse.reviews.length,
        averageRating: summaryResponse.averageRating,
        totalReviews: summaryResponse.totalReviews
      });

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to fetch reviews';
      console.error('❌ Error fetching reviews:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [consultantSlug]);

  // Submit a new review
  const submitReview = useCallback(async (reviewData: Omit<CreateReviewData, 'consultantId'>): Promise<Review> => {
    try {
      setIsSubmitting(true);
      setError(null);

      console.log('📝 Submitting review for consultant:', consultantSlug);

      // Use a special marker to indicate slug-based submission
      const newReview = await reviewApi.createReview({
        ...reviewData,
        consultantId: `slug:${consultantSlug}` // Backend will resolve this slug to actual ID
      });

      // Add the new review to the local state
      setReviews(prev => [newReview, ...prev]);

      // Update summary stats
      if (reviewSummary) {
        const newTotalReviews = reviewSummary.totalReviews + 1;
        const newAverageRating = (
          (reviewSummary.averageRating * reviewSummary.totalReviews + reviewData.rating) / 
          newTotalReviews
        );

        setReviewSummary(prev => prev ? {
          ...prev,
          totalReviews: newTotalReviews,
          averageRating: Number(newAverageRating.toFixed(1)),
          recentReviews: [newReview, ...prev.recentReviews.slice(0, 2)]
        } : null);
      }

      console.log('✅ Review submitted successfully:', newReview.id);
      return newReview;

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to submit review';
      console.error('❌ Error submitting review:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [consultantSlug, reviewSummary]);

  // Refresh reviews
  const refresh = useCallback(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount and when consultantSlug changes
  useEffect(() => {
    if (autoFetch && consultantSlug) {
      fetchReviews();
    }
  }, [autoFetch, consultantSlug, fetchReviews]);

  // Helper functions
  const getAverageRating = useCallback(() => {
    return reviewSummary?.averageRating || 0;
  }, [reviewSummary]);

  const getTotalReviews = useCallback(() => {
    return reviewSummary?.totalReviews || 0;
  }, [reviewSummary]);

  const getRatingDistribution = useCallback(() => {
    return reviewSummary?.ratingDistribution || {};
  }, [reviewSummary]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const getStarData = useCallback((rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return {
      stars: Array.from({ length: 5 }, (_, index) => ({
        index,
        isFilled: index < rating,
        sizeClass: sizeClasses[size]
      })),
      rating,
      size
    };
  }, []);

  return {
    // Data
    reviews,
    reviewSummary,
    
    // State
    isLoading,
    isSubmitting,
    error,
    
    // Actions
    submitReview,
    fetchReviews,
    refresh,
    clearError,
    
    // Helpers
    getAverageRating,
    getTotalReviews,
    getRatingDistribution,
    formatDate,
    getStarData,
    
    // Computed values
    hasReviews: reviews.length > 0,
    averageRating: getAverageRating(),
    totalReviews: getTotalReviews()
  };
};

export default useReviews;