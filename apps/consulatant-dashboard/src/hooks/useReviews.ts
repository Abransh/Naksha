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

      const newReview = await reviewApi.createReview({
        ...reviewData,
        consultantId: reviewSummary?.consultant?.slug === consultantSlug 
          ? 'temp-id' // This will be resolved by slug on backend
          : reviewData.consultantId || 'temp-id'
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

  const renderStars = useCallback((rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        className={`${sizeClasses[size]} ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
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
    renderStars,
    
    // Computed values
    hasReviews: reviews.length > 0,
    averageRating: getAverageRating(),
    totalReviews: getTotalReviews()
  };
};

export default useReviews;