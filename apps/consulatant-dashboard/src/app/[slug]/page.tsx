// apps/consulatant-dashboard/src/app/[slug]/page.tsx

"use client";

import { useState, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Star,
  CheckCircle,
  Quote,
  Loader2,
  AlertCircle,
  User,
  Linkedin,
  Instagram,
  Twitter,
} from "lucide-react";
import { useConsultantShowcase, usePriceFormatter } from "@/hooks/usePublicProfile";
import { BookSessionModal } from "@/components/modals/book-session-modal";
import { useReviews } from "@/hooks/useReviews";
import { ReviewForm } from "@/components/forms/ReviewForm";
import { StarRating } from "@/components/ui/star-rating";

interface ConsultantProfileProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ConsultantProfile({ params }: ConsultantProfileProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [consultantSlug, setConsultantSlug] = useState<string>('');
  const { formatPrice } = usePriceFormatter();
  
  // Resolve params asynchronously
  useEffect(() => {
    params.then((resolvedParams) => {
      setConsultantSlug(resolvedParams.slug);
    });
  }, [params]);

  const {
    summary,
    services,
    testimonials,
    ratings,
    socialLinks,
    isLoading,
    error,
    refetch,
  } = useConsultantShowcase(consultantSlug);

  // Review system integration
  const {
    reviews,
    reviewSummary,
    isSubmitting: isSubmittingReview,
    submitReview,
    formatDate,
    hasReviews,
    totalReviews,
    averageRating
  } = useReviews({
    consultantSlug: consultantSlug,
    autoFetch: !!consultantSlug
  });

  // Debug logging
  console.log('🔍 Page Component - Summary:', summary);
  console.log('🔍 Page Component - Services:', services);
  console.log('🔍 Page Component - Personal Session Description:', summary?.personalSessionDescription);
  console.log('🔍 Page Component - Webinar Session Description:', summary?.webinarSessionDescription);

  // Show loading state
  if (!consultantSlug || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-100)]">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-xl">Loading consultant profile...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-100)]">
        <div className="text-center text-white">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Consultant Not Found</h1>
          <p className="text-lg opacity-90 mb-4">
            {error || 'The consultant profile you\'re looking for doesn\'t exist.'}
          </p>
          <button 
            onClick={refetch}
            className="px-6 py-2 bg-white text-[var(--primary-100)] rounded-lg hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Use only database reviews (testimonials are now empty)
  const allTestimonials = reviews.map(review => ({
    text: review.reviewText,
    author: review.reviewerName,
    service: review.title || 'consultation',
    rating: review.rating,
    isVerified: review.isVerified,
    createdAt: review.createdAt,
    type: 'review' as const
  }));

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) =>
      prev === allTestimonials.length - 1 ? 0 : prev + 1,
    );
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) =>
      prev === 0 ? allTestimonials.length - 1 : prev - 1,
    );
  };

  // Handle review submission
  const handleReviewSubmit = async (reviewData: any) => {
    try {
      await submitReview(reviewData);
      // Refresh the consultant profile to update any dynamic content
      refetch();
    } catch (error) {
      console.error('Error submitting review:', error);
      // Error handling is already done in the useReviews hook and ReviewForm component
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Consultant Info */}
      <div className="w-[504px] bg-[var(--primary-100)] flex flex-col relative">
        {/* Profile Section */}
        <div className="px-11 pt-16">
          {/* Profile Image */}
          <div className="mb-16">
            {summary.profilePhoto ? (
              <img
                src={summary.profilePhoto}
                alt={summary.name}
                className="w-[220px] h-[220px] rounded-full object-cover"
              />
            ) : (
              <div className="w-[220px] h-[220px] rounded-full bg-white/20 flex items-center justify-center">
                <User size={80} className="text-white/60" />
              </div>
            )}
          </div>

          {/* Name and Verification */}
          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-[36px] font-bold text-black leading-[46.8px] font-inter">
              {summary.name}
            </h1>
            {summary.verified && (
              <CheckCircle size={24} className=" text-black" />
            )}
          </div>

          {/* Bio */}
          <p className="text-lg text-black leading-[27px] font-inter font-medium max-w-[418px]">
            {summary.experience > 0 && `${summary.experience} years in `}{summary.sector} | {summary.bio}
            {summary.completedSessions > 0 && ` | ${summary.completedSessions} sessions completed`}
          </p>
        </div>
      </div>

      {/* Right Side - Services and Content */}
      <div className="flex-1 bg-[#E8E7E7] p-0">
        <div className="w-[1008px] bg-white min-h-screen relative">
          {/* Header Space */}
          <div className="h-[72px] mx-[84px] mt-[31px]"></div>

          {/* Service Cards */}
          <div className="flex gap-10 mx-[84px] mt-9">
            {/* Webinar Card */}
            <Card className="w-[400px] h-[302px] rounded-[32px] bg-white/95 border border-white shadow-sm relative">
              <CardContent className="p-6">
                {/* Tags */}
                <div className="flex gap-3 mb-4">
                  <div className="inline-flex items-center gap-1 px-2 py-[7px] rounded-full bg-[#D1F6DE]">
                    <div className="w-4 h-4 rounded-full bg-[#B6E7CE] relative">
                      <div className="w-2 h-2 rounded-full bg-[#008060] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    <span className="text-sm font-semibold text-[#000E04] font-inter">
                      Webinar
                    </span>
                  </div>
                  <div className="px-[10px] py-[7px] rounded-full bg-[#FEE4CC]">
                    <span className="text-sm font-semibold text-[#814416] font-inter">
                      Selling fast
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-[#141414] leading-7 -tracking-[0.1px] mb-2 font-inter">
                  {services.find(s => s.type === 'Webinar')?.title || 'Group Webinar Session'}
                </h3>

                {/* Description */}
                <p className="text-base text-[#5C5C5C] leading-[20.8px] mb-6 font-inter">
                  {summary.webinarSessionDescription || services.find(s => s.type === 'Webinar')?.description || 'Join our group learning session with expert guidance'}
                </p>

                {/* Event Details */}
                <div className="bg-[var(--primary-100)] rounded-[18px] p-4 flex items-center gap-3 relative">
                  {/* Calendar Icon */}
                  <Calendar size={36} className="text-white" />

                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="text-base font-bold text-white font-inter">
                      Tue, 4 Aug&apos;23
                    </div>
                    <div className="text-sm text-white font-inter">
                      18:30 - 19:30 GMT+5:30
                    </div>
                  </div>

                  {/* Price and Arrow */}
                  <BookSessionModal 
                    consultantSlug={consultantSlug || ''}
                    sessionType="WEBINAR"
                    amount={services.find(s => s.type === 'Webinar')?.price || 0}
                    title="Group Webinar Session"
                  >
                    <div className="flex items-center gap-1 px-3 py-2 bg-white rounded-full border  cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-base text-[var(--primary-100)]  font-inter">
                        {formatPrice(services.find(s => s.type === 'Webinar')?.price || 0)}
                      </span>
                      <ArrowRight size={12} className="text-[var(--primary-100)] " />
                    </div>
                  </BookSessionModal>
                </div>
              </CardContent>
            </Card>

            {/* Personal Session Card */}
            <Card className="w-[400px] h-[274px] rounded-[32px] bg-white/95 border border-white shadow-sm relative">
              <CardContent className="p-6">
                {/* Tags */}
                <div className="flex gap-3 mb-4">
                  <div className="inline-flex items-center gap-1 px-2 py-[7px] rounded-full bg-[#D1F6DE]">
                    <div className="w-4 h-4 rounded-full bg-[#B6E7CE] relative">
                      <div className="w-2 h-2 rounded-full bg-[#008060] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    <span className="text-sm font-semibold text-[#000E04] font-inter">
                      Personal Session
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-[7px] rounded-full bg-[#F3F3F7]">
                    <Star size={16} className="text-black fill-current" />
                    <span className="text-sm font-semibold text-[#141414] font-inter">
                      {ratings.average}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-[#141414] leading-7 -tracking-[0.1px] mb-2 font-inter">
                  {services.find(s => s.type === 'Personal Session')?.title || '1-on-1 Personal Session'}
                </h3>

                {/* Description */}
                <p className="text-base text-[#5C5C5C] leading-[20.8px] mb-6 font-inter">
                  {summary.personalSessionDescription || services.find(s => s.type === 'Personal Session')?.description || 'Personalized one-on-one consultation tailored to your needs'}
                </p>

                {/* Session Details */}
                <div className="bg-[var(--primary-100)] rounded-xl p-4 flex items-center gap-3 relative">
                  {/* Calendar Icon */}
                  <Calendar size={36} className="text-white" />

                  {/* Session Info */}
                  <div className="flex-1">
                    <div className="text-base font-bold text-white font-inter">
                      Personal Session
                    </div>
                    <div className="text-sm text-white font-inter">
                      Video Meeting
                    </div>
                  </div>

                  {/* Price Button */}
                  <BookSessionModal 
                    consultantSlug={consultantSlug || ''}
                    sessionType="PERSONAL"
                    amount={services.find(s => s.type === 'Personal Session')?.price || 0}
                    title="1-on-1 Personal Session"
                  >
                    <div className="bg-white rounded-full px-8 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-base font-semibold text-[var(--primary-100)] font-inter">
                        {formatPrice(services.find(s => s.type === 'Personal Session')?.price || 0)}
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-[var(--primary-100)]"
                      />
                    </div>
                  </BookSessionModal>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ratings and Feedback Section */}
          <div className="mx-[84px] mt-16">
            <h2 className="text-[40px] font-medium text-[#141414] leading-[60px] mb-6 font-inter">
              Ratings and feedback
            </h2>

            <div className="flex gap-10 mb-12">
              {/* Rating Stats */}
              <Card className="w-[176px] h-[175px] rounded-[32px] bg-white/95 border border-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="text-[32px] font-bold text-black leading-8 mb-3 font-inter">
                    {averageRating > 0 ? `${averageRating}/5` : `${ratings.average}/5`}
                  </div>
                  <div className="text-base font-medium text-[var(--primary-100)] uppercase tracking-[0.15px] font-inter">
                    {totalReviews > 0 ? `${totalReviews} reviews` : `${ratings.total} ratings`}
                  </div>
                </CardContent>
              </Card>

              {/* Total Reviews */}
              <Card className="w-[176px] h-[175px] rounded-[32px] bg-white/95 border border-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="text-[32px] font-bold text-black leading-8 mb-3 font-inter">
                    {allTestimonials.length}
                  </div>
                  <div className="text-base font-medium text-[var(--primary-100)] uppercase tracking-[0.15px] font-inter">
                    {allTestimonials.length === 1 ? 'review' : 'reviews'}
                  </div>
                </CardContent>
              </Card>

              {/* Review Form */}
              <ReviewForm
                consultantId={consultantSlug || ''}
                consultantName={`${summary?.name || 'this consultant'}`}
                onSubmit={handleReviewSubmit}
                isSubmitting={isSubmittingReview}
              />
            </div>

            {/* Reviews and Testimonials */}
            {reviews.length > 0 && !isLoading ? (
              <div className="grid grid-cols-2 gap-10 mb-16">
                {/* Large Review/Testimonial */}
                <Card className="w-[390px] h-[520px] rounded-[32px] bg-white border border-white shadow-sm">
                  <CardContent className="p-6 relative">
                    <Quote size={44} className="text-gray-400 mb-4" />
                    
                    {/* Rating stars for reviews */}
                    {allTestimonials[currentTestimonial]?.rating && (
                      <div className="flex items-center gap-1 mb-6">
                        <StarRating rating={allTestimonials[currentTestimonial].rating} size="sm" />
                        {allTestimonials[currentTestimonial]?.isVerified && (
                          <CheckCircle size={16} className="text-green-500 ml-2" />
                        )}
                      </div>
                    )}
                    
                    <p className="text-lg font-medium text-black leading-[31.5px] mb-12 font-inter">
                      {allTestimonials[currentTestimonial]?.text || 'Loading...'}
                    </p>
                    
                    <div className="absolute bottom-6 left-6 right-6 mt-4">
                      <span className="text-base font-bold text-black font-inter">
                        {allTestimonials[currentTestimonial]?.author || 'Anonymous'}
                      </span>
                      <span className="text-base text-gray-600 font-inter">
                        , {allTestimonials[currentTestimonial]?.service || 'consultation'}
                      </span>
                      {allTestimonials[currentTestimonial]?.createdAt && (
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(allTestimonials[currentTestimonial].createdAt)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Smaller Reviews/Testimonials */}
                <div className="space-y-6">
                  {[1, 2].map((offset) => {
                    const index = (currentTestimonial + offset) % allTestimonials.length;
                    const item = allTestimonials[index];
                    
                    if (!item) return null;
                    
                    return (
                      <Card key={`testimonial-${index}`} className="w-[390px] h-[240px] rounded-[32px] bg-white border border-white shadow-sm">
                        <CardContent className="p-6 relative">
                          <Quote size={44} className="text-gray-400 mb-4" />
                          
                          {/* Rating stars for reviews */}
                          {item.rating && (
                            <div className="flex items-center gap-1 mb-3">
                              <StarRating rating={item.rating} size="sm" />
                              {item.isVerified && (
                                <CheckCircle size={14} className="text-green-500 ml-1" />
                              )}
                            </div>
                          )}
                          
                          <p className="text-lg font-medium text-black leading-[31.5px] mb-4 font-inter line-clamp-3">
                            {item.text}
                          </p>
                          
                          <div className="absolute bottom-6 left-6 right-6">
                            <span className="text-base font-bold text-black font-inter mt-12">
                              {item.author}
                            </span>
                            <span className="text-base text-gray-600 font-inter mt-6">
                              , {item.service}
                            </span>
                            {item.createdAt && (
                              <div className="text-xs text-gray-500 mt-6">
                                {formatDate(item.createdAt)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Loading reviews...
                </h3>
                <p className="text-gray-500">
                  Please wait while we fetch reviews for {summary?.name}
                </p>
              </div>
            ) : (
              <div className="text-center py-16">
                <Quote size={64} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No reviews yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Be the first to share your experience with {summary?.name}
                </p>
                <p className="text-sm text-gray-400">
                  Reviews help other users make informed decisions about consulting services
                </p>
              </div>
            )}

            {/* Navigation Arrows - Only show when there are multiple reviews */}
            {reviews.length > 1 && !isLoading && (
              <div className="flex gap-4 justify-center mb-16">
                <button
                  onClick={prevTestimonial}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                  disabled={reviews.length <= 1}
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                  disabled={reviews.length <= 1}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            )}

            {/* Social Links */}
            <div className="mb-16">
              <h2 className="text-[40px] font-bold text-[#141414] leading-[60px] mb-6 font-inter">
                My Social Links
              </h2>
              <div className="flex gap-4">
                {socialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-20 rounded-2xl bg-white/95 border border-white shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                  >
                    {link.icon === 'linkedin' && (
                      <Linkedin size={36} className="text-[#0077B5]" />
                    )}
                    {link.icon === 'instagram' && (
                      <Instagram size={36} className="text-pink-500" />
                    )}
                    {(link.icon === 'twitter' || link.icon === 'x') && (
                      <Twitter size={36} className="text-black" />
                    )}
                  </a>
                ))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
