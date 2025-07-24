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
} from "lucide-react";
import { useConsultantShowcase, usePriceFormatter } from "@/hooks/usePublicProfile";
import { BookSessionModal } from "@/components/modals/book-session-modal";

interface ConsultantProfileProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ConsultantProfile({ params }: ConsultantProfileProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [consultantSlug, setConsultantSlug] = useState<string | null>(null);
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
  } = useConsultantShowcase(consultantSlug || '');

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

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1,
    );
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1,
    );
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
                        {formatPrice(services.find(s => s.type === 'Personal Session')?.price || 0)}+
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
                    {ratings.average}/5
                  </div>
                  <div className="text-base font-medium text-[var(--primary-100)] uppercase tracking-[0.15px] font-inter">
                    {ratings.total} ratings
                  </div>
                </CardContent>
              </Card>

              {/* Testimonials Count */}
              <Card className="w-[176px] h-[175px] rounded-[32px] bg-white/95 border border-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="text-[32px] font-bold text-black leading-8 mb-3 font-inter">
                    {testimonials.length}
                  </div>
                  <div className="text-base font-medium text-[var(--primary-100)] uppercase tracking-[0.15px] font-inter">
                    testimonials
                  </div>
                </CardContent>
              </Card>

              {/* Write Review */}
              <div className="flex items-center">
                <span className="text-xl text-black font-inter">
                  Write a review...
                </span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-2 gap-10 mb-16">
              {/* Large Testimonial */}
              <Card className="w-[390px] h-[520px] rounded-[32px] bg-white border border-white shadow-sm">
                <CardContent className="p-6">
                  <Quote size={44} className="text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-black leading-[31.5px] mb-8 font-inter">
                    {testimonials[currentTestimonial]?.text || 'Excellent service and professional guidance.'}
                  </p>
                  <div className="absolute bottom-6">
                    <span className="text-base font-bold text-black font-inter">
                      {testimonials[currentTestimonial]?.author || 'Anonymous'}
                    </span>
                    <span className="text-base text-gray-600 font-inter">
                      , {testimonials[currentTestimonial]?.service || 'consultation'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Smaller Testimonials */}
              <div className="space-y-6">
                <Card className="w-[390px] h-[240px] rounded-[32px] bg-white border border-white shadow-sm">
                  <CardContent className="p-6">
                    <Quote size={44} className="text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-black leading-[31.5px] mb-4 font-inter">
                      {testimonials[1]?.text || 'Great experience with valuable insights.'}
                    </p>
                    <div>
                      <span className="text-base font-bold text-black font-inter">
                        {testimonials[1]?.author || 'Anonymous'}
                      </span>
                      <span className="text-base text-gray-600 font-inter">
                        , {testimonials[1]?.service || 'consultation'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="w-[390px] h-[240px] rounded-[32px] bg-white border border-white shadow-sm">
                  <CardContent className="p-6">
                    <Quote size={44} className="text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-black leading-[31.5px] mb-4 font-inter">
                      {testimonials[2]?.text || 'Professional service with actionable advice.'}
                    </p>
                    <div>
                      <span className="text-base font-bold text-black font-inter">
                        {testimonials[2]?.author || 'Anonymous'}
                      </span>
                      <span className="text-base text-gray-600 font-inter">
                        , {testimonials[2]?.service || 'consultation'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex gap-4 justify-center mb-16">
              <button
                onClick={prevTestimonial}
                className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={nextTestimonial}
                className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ArrowRight size={20} />
              </button>
            </div>

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
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 36 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_237_10413)">
                          <path
                            d="M34 0H2C0.89543 0 0 0.89543 0 2V34C0 35.1046 0.89543 36 2 36H34C35.1046 36 36 35.1046 36 34V2C36 0.89543 35.1046 0 34 0Z"
                            fill="#0077B5"
                          />
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M6.57011 13.9226H11.3816V29.4036H6.57011V13.9226ZM8.97661 6.22706C10.5151 6.22706 11.7651 7.47706 11.7651 9.01556C11.7651 10.5556 10.5151 11.8061 8.97661 11.8061C8.60584 11.8131 8.23739 11.7461 7.89281 11.6091C7.54822 11.4721 7.23441 11.2677 6.96972 11.008C6.70504 10.7483 6.49478 10.4384 6.35125 10.0964C6.20772 9.75451 6.13379 9.3874 6.13379 9.01656C6.13379 8.64573 6.20772 8.27862 6.35125 7.93669C6.49478 7.59476 6.70504 7.28487 6.96972 7.02515C7.23441 6.76542 7.54822 6.56107 7.89281 6.42404C8.23739 6.28701 8.60584 6.22004 8.97661 6.22706ZM14.3996 13.9221H19.0146V16.0376H19.0786C19.7211 14.8206 21.2906 13.5376 23.6311 13.5376C28.5031 13.5376 29.4031 16.7441 29.4031 20.9126V29.4036H24.5946V21.8751C24.5946 20.0801 24.5616 17.7706 22.0946 17.7706C19.5911 17.7706 19.2066 19.7261 19.2066 21.7456V29.4036H14.3991V13.9226L14.3996 13.9221Z"
                            fill="white"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_237_10413">
                            <rect width="36" height="36" rx="3" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    )}
                    {link.icon === 'instagram' && (
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <rect width="36" height="36" rx="8" fill="url(#instagram-gradient)"/>
                        <path d="M18 8.5C15.3 8.5 14.97 8.51 13.96 8.55C12.96 8.6 12.27 8.77 11.67 9.01C11.05 9.26 10.53 9.59 10.01 10.11C9.49 10.63 9.16 11.15 8.91 11.77C8.67 12.37 8.5 13.06 8.45 14.06C8.41 15.07 8.4 15.4 8.4 18.1C8.4 20.8 8.41 21.13 8.45 22.14C8.5 23.14 8.67 23.83 8.91 24.43C9.16 25.05 9.49 25.57 10.01 26.09C10.53 26.61 11.05 26.94 11.67 27.19C12.27 27.43 12.96 27.6 13.96 27.65C14.97 27.69 15.3 27.7 18 27.7C20.7 27.7 21.03 27.69 22.04 27.65C23.04 27.6 23.73 27.43 24.33 27.19C24.95 26.94 25.47 26.61 25.99 26.09C26.51 25.57 26.84 25.05 27.09 24.43C27.33 23.83 27.5 23.14 27.55 22.14C27.59 21.13 27.6 20.8 27.6 18.1C27.6 15.4 27.59 15.07 27.55 14.06C27.5 13.06 27.33 12.37 27.09 11.77C26.84 11.15 26.51 10.63 25.99 10.11C25.47 9.59 24.95 9.26 24.33 9.01C23.73 8.77 23.04 8.6 22.04 8.55C21.03 8.51 20.7 8.5 18 8.5ZM18 10.7C20.66 10.7 20.97 10.71 21.96 10.75C22.86 10.79 23.35 10.95 23.68 11.08C24.12 11.26 24.43 11.47 24.76 11.8C25.09 12.13 25.3 12.44 25.48 12.88C25.61 13.21 25.77 13.7 25.81 14.6C25.85 15.59 25.86 15.9 25.86 18.56C25.86 21.22 25.85 21.53 25.81 22.52C25.77 23.42 25.61 23.91 25.48 24.24C25.3 24.68 25.09 24.99 24.76 25.32C24.43 25.65 24.12 25.86 23.68 26.04C23.35 26.17 22.86 26.33 21.96 26.37C20.97 26.41 20.66 26.42 18 26.42C15.34 26.42 15.03 26.41 14.04 26.37C13.14 26.33 12.65 26.17 12.32 26.04C11.88 25.86 11.57 25.65 11.24 25.32C10.91 24.99 10.7 24.68 10.52 24.24C10.39 23.91 10.23 23.42 10.19 22.52C10.15 21.53 10.14 21.22 10.14 18.56C10.14 15.9 10.15 15.59 10.19 14.6C10.23 13.7 10.39 13.21 10.52 12.88C10.7 12.44 10.91 12.13 11.24 11.8C11.57 11.47 11.88 11.26 12.32 11.08C12.65 10.95 13.14 10.79 14.04 10.75C15.03 10.71 15.34 10.7 18 10.7Z" fill="white"/>
                        <path d="M18 12.9C16.23 12.9 14.73 14.4 14.73 16.17C14.73 17.94 16.23 19.44 18 19.44C19.77 19.44 21.27 17.94 21.27 16.17C21.27 14.4 19.77 12.9 18 12.9ZM18 17.6C17.25 17.6 16.64 16.99 16.64 16.24C16.64 15.49 17.25 14.88 18 14.88C18.75 14.88 19.36 15.49 19.36 16.24C19.36 16.99 18.75 17.6 18 17.6Z" fill="white"/>
                        <circle cx="21.5" cy="12.8" r="1.1" fill="white"/>
                        <defs>
                          <linearGradient id="instagram-gradient" x1="0" y1="0" x2="36" y2="36">
                            <stop stopColor="#F58529"/>
                            <stop offset="0.5" stopColor="#DD2A7B"/>
                            <stop offset="1" stopColor="#8134AF"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                    {link.icon === 'twitter' && (
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <rect width="36" height="36" rx="8" fill="black"/>
                        <path d="M27 12.5C26.3 12.8 25.5 13 24.7 13.1C25.5 12.6 26.1 11.8 26.4 10.8C25.6 11.3 24.7 11.6 23.7 11.8C23 11 22 10.5 20.8 10.5C18.5 10.5 16.7 12.3 16.7 14.6C16.7 14.9 16.7 15.2 16.8 15.5C13.4 15.3 10.4 13.7 8.4 11.2C8.1 11.9 7.9 12.6 7.9 13.4C7.9 14.9 8.7 16.2 9.9 17C9.2 17 8.5 16.8 7.9 16.5V16.5C7.9 18.5 9.3 20.2 11.1 20.6C10.8 20.7 10.5 20.7 10.1 20.7C9.9 20.7 9.6 20.7 9.4 20.6C9.9 22.3 11.4 23.5 13.2 23.5C11.8 24.6 10 25.3 8 25.3C7.7 25.3 7.4 25.3 7.1 25.2C8.9 26.4 11.1 27.1 13.4 27.1C20.8 27.1 24.8 20.8 24.8 15.1V14.6C25.6 14 26.3 13.3 27 12.5Z" fill="white"/>
                      </svg>
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
