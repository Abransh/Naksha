/**
 * Review Form Component
 * Allows users to submit reviews for consultants with rating and text
 */

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { CreateReviewData } from '@/lib/api';
import { toast } from 'sonner';

interface ReviewFormProps {
  consultantId: string;
  consultantName: string;
  onReviewSubmitted?: (review: any) => void;
  onSubmit: (reviewData: Omit<CreateReviewData, 'consultantId'>) => Promise<void>;
  isSubmitting?: boolean;
}

export const ReviewForm = ({ 
  consultantId, 
  consultantName, 
  onReviewSubmitted, 
  onSubmit,
  isSubmitting = false 
}: ReviewFormProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleStarHover = (starRating: number) => {
    setHoveredRating(starRating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const resetForm = () => {
    setRating(0);
    setReviewText('');
    setReviewerName('');
    setReviewerEmail('');
    setTitle('');
    setHoveredRating(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }

    if (!reviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (reviewText.length < 10) {
      toast.error('Review must be at least 10 characters long');
      return;
    }

    try {
      const reviewData = {
        rating,
        reviewText: reviewText.trim(),
        reviewerName: reviewerName.trim(),
        reviewerEmail: reviewerEmail.trim() || undefined,
        title: title.trim() || undefined,
      };

      await onSubmit(reviewData);

      // Reset form and show success state
      resetForm();
      setIsSubmitted(true);
      setIsExpanded(false);
      
      toast.success('Review submitted successfully!');

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsExpanded(false);
  };

  // Render stars for rating input
  const renderRatingStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starRating = index + 1;
      const isActive = starRating <= (hoveredRating || rating);
      
      return (
        <button
          key={index}
          type="button"
          className={`transition-colors duration-150 ${
            isActive ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
          }`}
          onClick={() => handleStarClick(starRating)}
          onMouseEnter={() => handleStarHover(starRating)}
          onMouseLeave={handleStarLeave}
          disabled={isSubmitting}
        >
          <Star 
            size={24} 
            className={isActive ? 'fill-current' : ''} 
          />
        </button>
      );
    });
  };

  // Success state
  if (isSubmitted) {
    return (
      <Card className="w-[352px] h-[175px] rounded-[32px] bg-white/95 border border-white shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <h3 className="text-lg font-semibold text-black mb-1">
            Thank you for your review!
          </h3>
          <p className="text-sm text-gray-600">
            Your feedback helps others find great consultants
          </p>
        </CardContent>
      </Card>
    );
  }

  // Collapsed state - shows "Write a review..." button
  if (!isExpanded) {
    return (
      <Card 
        className="w-[352px] h-[175px] rounded-[32px] bg-white/95 border border-white shadow-sm cursor-pointer hover:bg-white transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="flex flex-col items-center justify-center h-full">
          <div className="flex items-center gap-2 mb-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} size={20} className="text-gray-300" />
            ))}
          </div>
          <span className="text-lg text-black font-inter">
            Write a review...
          </span>
          <p className="text-sm text-gray-500 mt-1">
            Share your experience with {consultantName}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Expanded form state
  return (
    <Card className="w-[800px] rounded-[32px] bg-white/95 border border-white shadow-sm">
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-black mb-2">
              Write a Review
            </h3>
            <p className="text-gray-600">
              Share your experience with {consultantName}
            </p>
          </div>

          {/* Rating Selection */}
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you rate your experience?
            </label>
            <div className="flex items-center justify-center gap-1">
              {renderRatingStars()}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Review Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label htmlFor="reviewerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <Input
                  id="reviewerName"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="reviewerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <Input
                  id="reviewerEmail"
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Title (Optional)
                </label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your experience"
                  disabled={isSubmitting}
                  className="w-full"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Right Column */}
            <div>
              <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-2">
                Your Review *
              </label>
              <Textarea
                id="reviewText"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell others about your experience with this consultant. What was helpful? What did you learn?"
                required
                disabled={isSubmitting}
                className="w-full h-[140px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reviewText.length}/1000 characters
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !rating || !reviewText.trim() || !reviewerName.trim()}
              className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;