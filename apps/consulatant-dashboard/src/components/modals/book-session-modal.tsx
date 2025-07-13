// apps/consulatant-dashboard/src/components/modals/book-session-modal.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, Clock, AlertCircle } from "lucide-react";
import { bookSession } from "@/lib/api";
import { useAvailableSlots, useAvailabilityFormatter } from "@/hooks/useAvailableSlots";

interface SessionBookingData {
  // Client Information
  fullName: string;
  email: string;
  phone: string;
  
  // Session Information
  sessionType: 'PERSONAL' | 'WEBINAR';
  selectedDate: string;
  selectedTime: string;
  duration: number;
  amount: number;
  
  // Additional Information
  clientNotes: string;
}

interface BookSessionModalProps {
  children: React.ReactNode;
  consultantSlug: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  amount: number;
  title: string;
}

export function BookSessionModal({ 
  children, 
  consultantSlug, 
  sessionType, 
  amount, 
  title 
}: BookSessionModalProps) {
  const [formData, setFormData] = useState<SessionBookingData>({
    fullName: "",
    email: "",
    phone: "",
    sessionType,
    selectedDate: "",
    selectedTime: "",
    duration: sessionType === 'PERSONAL' ? 60 : 120,
    amount,
    clientNotes: ""
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch real availability data with enhanced capabilities
  const { 
    availableDates, 
    availableTimesForDate, 
    isLoading: availabilityLoading, 
    error: availabilityError,
    refetch: refetchAvailability,
    retry: retryAvailability,
    isCached,
    cacheTimestamp,
    loadMore,
    hasMore
  } = useAvailableSlots(consultantSlug, sessionType);

  const { formatDate, formatTime } = useAvailabilityFormatter();

  const handleInputChange = (field: keyof SessionBookingData, value: string | number) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      
      // Clear selected time when date changes (new date might have different available times)
      if (field === 'selectedDate') {
        updated.selectedTime = '';
      }
      
      return updated;
    });
  };

  const handleNext = () => {
    if (currentStep < 3) {
      // Enhanced step 1 -> 2 transition with better logic
      if (currentStep === 1) {
        // If still loading but taking too long, allow user to proceed with retry option
        if (availabilityLoading) {
          console.log('🔍 BookSessionModal: Loading availability, but allowing proceed with retry option');
          // Allow proceeding if loading is taking too long (user can retry in step 2)
          const loadingTime = Date.now() - (cacheTimestamp || Date.now());
          if (loadingTime > 5000) { // 5 seconds threshold
            console.log('🕐 BookSessionModal: Loading timeout exceeded, proceeding to step 2');
            setCurrentStep(currentStep + 1);
            return;
          } else {
            console.log('🔍 BookSessionModal: Still within loading threshold, waiting...');
            return;
          }
        }
        
        // If there's an error but we have cached data, allow proceeding
        if (availabilityError && availableDates.length > 0) {
          console.log('🔍 BookSessionModal: Error present but cached data available, proceeding');
          setCurrentStep(currentStep + 1);
          return;
        }
        
        // If there's an error and no data, block progression
        if (availabilityError && availableDates.length === 0) {
          console.log('🔍 BookSessionModal: Cannot proceed - error and no availability data');
          return;
        }
        
        // If no availability found, still allow proceeding (step 2 will show "no availability" message)
        if (availableDates.length === 0) {
          console.log('🔍 BookSessionModal: No availability found, but proceeding to show empty state');
          setCurrentStep(currentStep + 1);
          return;
        }
      }
      
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await bookSession({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        sessionType: formData.sessionType,
        selectedDate: formData.selectedDate || '', // Handle manual booking case
        selectedTime: formData.selectedTime || '', // Handle manual booking case
        duration: formData.duration,
        amount: formData.amount,
        clientNotes: formData.clientNotes + ((!formData.selectedDate || !formData.selectedTime) ? 
          '\n\nNote: Manual scheduling requested - consultant will contact directly to arrange session time.' : ''),
        consultantSlug
      });
      
      console.log('✅ Session booked successfully:', result);
      
      setIsOpen(false);
      setCurrentStep(1);
      resetForm();
      
      // Enhanced success message based on booking type
      const bookingType = (formData.selectedDate && formData.selectedTime) ? 'scheduled' : 'manual';
      const successMessage = bookingType === 'scheduled' 
        ? "Session booked successfully! You will receive a confirmation email with meeting details shortly."
        : "Booking request submitted! The consultant will contact you directly to schedule your session.";
      
      alert(successMessage);
      
    } catch (error) {
      console.error("❌ Session booking error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to book session. Please try again.";
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      sessionType,
      selectedDate: "",
      selectedTime: "",
      duration: sessionType === 'PERSONAL' ? 60 : 120,
      amount,
      clientNotes: ""
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    setCurrentStep(1);
    resetForm();
  };

  // Get available time slots for the selected date
  const availableTimesForSelectedDate = formData.selectedDate 
    ? availableTimesForDate(formData.selectedDate) 
    : [];

  // Refresh availability when modal opens
  useEffect(() => {
    if (isOpen && consultantSlug) {
      refetchAvailability();
    }
  }, [isOpen, consultantSlug, refetchAvailability]);

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.email && formData.phone;
      case 2:
        // Enhanced validation for step 2 - more flexible
        // Allow proceeding if:
        // 1. We have data and user has made selections
        // 2. We're in an error state but user wants to retry
        // 3. No availability but we want to show the empty state
        
        if (availabilityError) {
          // If there's an error, user can proceed to see retry options
          return true;
        }
        
        if (availabilityLoading) {
          // If still loading, don't allow proceeding
          return false;
        }
        
        if (availableDates.length === 0) {
          // If no availability, allow proceeding to show "no availability" message
          return true;
        }
        
        // If we have availability, require selections
        return formData.selectedDate && formData.selectedTime;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Enhanced debug logging for availability states
  useEffect(() => {
    console.log('🔍 BookSessionModal: Availability state update', {
      availabilityLoading,
      availabilityError,
      availableDatesCount: availableDates.length,
      availableDates: availableDates.slice(0, 3), // First 3 dates for debugging
      consultantSlug,
      sessionType,
      isCached,
      cacheTimestamp: cacheTimestamp ? new Date(cacheTimestamp).toLocaleTimeString() : null,
      hasMore,
      modalStep: currentStep
    });
  }, [availabilityLoading, availabilityError, availableDates, consultantSlug, sessionType, isCached, cacheTimestamp, hasMore, currentStep]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-lg mx-auto bg-white rounded-xl border-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-black font-poppins">
                Book {title}
              </h2>
              <p className="text-sm text-[var(--black-30)] font-inter">
                ₹{amount.toLocaleString('en-IN')} • {formData.duration} minutes
              </p>
            </div>
            <DialogClose asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--secondary-30)] hover:bg-[var(--secondary-30)]/80 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18"
                    stroke="#1C1D22"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6L18 18"
                    stroke="#1C1D22"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </DialogClose>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-[var(--primary-100)] text-white'
                      : 'bg-[var(--secondary-30)] text-[var(--black-30)]'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step < currentStep
                        ? 'bg-[var(--primary-100)]'
                        : 'bg-[var(--secondary-30)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-base font-medium text-[var(--black-60)] font-inter">
                Personal Information
              </h3>

              <div className="space-y-4">
                <Input
                  placeholder="Full Name *"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="h-[52px] bg-[var(--input-defaultBackground)] text-black border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />

                <Input
                  placeholder="Email Address *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-[52px] bg-[var(--input-defaultBackground)] text-black border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />

                <Input
                  placeholder="Phone Number *"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="h-[52px] bg-[var(--input-defaultBackground)] text-black border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Schedule Session */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-base font-medium text-[var(--black-60)] font-inter">
                Schedule Your Session
              </h3>

              {/* Enhanced Loading State */}
              {availabilityLoading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="flex items-center gap-3 text-[var(--black-40)]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading availability...</span>
                  </div>
                  {isCached && (
                    <div className="text-xs text-[var(--black-30)] text-center max-w-xs">
                      Using cached data while fetching latest availability
                    </div>
                  )}
                  <div className="text-xs text-[var(--black-30)] text-center max-w-xs">
                    This may take a few seconds...
                  </div>
                </div>
              )}

              {/* Enhanced Error State */}
              {availabilityError && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      {availableDates.length > 0 ? 'Using cached availability data' : 'Failed to load availability'}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {availableDates.length > 0 
                        ? 'The latest data could not be fetched, but cached availability is shown below.'
                        : availabilityError
                      }
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={retryAvailability}
                        className="text-sm text-amber-800 bg-amber-100 px-3 py-1 rounded hover:bg-amber-200 transition-colors"
                        disabled={availabilityLoading}
                      >
                        {availabilityLoading ? 'Retrying...' : 'Retry'}
                      </button>
                      <button 
                        onClick={refetchAvailability}
                        className="text-sm text-amber-700 underline hover:no-underline"
                        disabled={availabilityLoading}
                      >
                        Refresh
                      </button>
                      {availableDates.length === 0 && (
                        <button 
                          onClick={() => setCurrentStep(3)}
                          className="text-sm text-amber-700 underline hover:no-underline ml-2"
                        >
                          Continue anyway
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced No Availability State */}
              {!availabilityLoading && !availabilityError && availableDates.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <Calendar className="h-12 w-12 text-[var(--black-30)]" />
                  <div>
                    <p className="text-base font-medium text-[var(--black-60)]">No availability found</p>
                    <p className="text-sm text-[var(--black-40)] mt-1 max-w-sm">
                      This consultant hasn't set up availability for {sessionType.toLowerCase()} sessions yet, or all slots are currently booked.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <button 
                        onClick={refetchAvailability}
                        className="text-sm text-[var(--primary-100)] bg-[var(--primary-100)]/10 px-4 py-2 rounded-lg hover:bg-[var(--primary-100)]/20 transition-colors"
                        disabled={availabilityLoading}
                      >
                        {availabilityLoading ? 'Checking...' : 'Check again'}
                      </button>
                      <button 
                        onClick={() => setCurrentStep(3)}
                        className="text-sm text-[var(--black-60)] border border-[var(--black-20)] px-4 py-2 rounded-lg hover:bg-[var(--black-5)] transition-colors"
                      >
                        Continue with manual booking
                      </button>
                    </div>
                    <p className="text-xs text-[var(--black-30)] mt-3">
                      You can still provide your details and the consultant will contact you directly.
                    </p>
                  </div>
                </div>
              )}

              {/* Available Slots */}
              {!availabilityLoading && !availabilityError && availableDates.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-black font-medium text-[var(--black-60)] mb-2">
                      Select Date *
                    </label>
                    <Select
                      value={formData.selectedDate}
                      onValueChange={(value) => handleInputChange("selectedDate", value)}
                    >
                      <SelectTrigger className="h-[52px] text-black bg-[var(--input-defaultBackground)] border-0 rounded-lg">
                        <SelectValue placeholder="Choose a date" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {formatDate(date)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                      Select Time *
                    </label>
                    <Select
                      value={formData.selectedTime}
                      onValueChange={(value) => handleInputChange("selectedTime", value)}
                      disabled={!formData.selectedDate}
                    >
                      <SelectTrigger className="h-[52px] text-black bg-[var(--input-defaultBackground)] border-0 rounded-lg">
                        <SelectValue placeholder={
                          formData.selectedDate 
                            ? "Choose a time" 
                            : "First select a date"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimesForSelectedDate.length > 0 ? (
                          availableTimesForSelectedDate.map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTime(time)}
                            </SelectItem>
                          ))
                        ) : (
                          formData.selectedDate && (
                            <div className="p-2 text-sm text-[var(--black-40)] text-center">
                              No available times for this date
                            </div>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Availability Summary */}
                  {formData.selectedDate && availableTimesForSelectedDate.length > 0 && (
                    <div className="bg-[var(--secondary-10)] rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-[var(--black-60)]">
                        <Clock className="h-4 w-4" />
                        <span>
                          {availableTimesForSelectedDate.length} time slot{availableTimesForSelectedDate.length === 1 ? '' : 's'} available on {formatDate(formData.selectedDate)}
                        </span>
                      </div>
                      {isCached && (
                        <div className="text-xs text-[var(--black-40)] mt-1">
                          📋 Using cached data from {cacheTimestamp ? new Date(cacheTimestamp).toLocaleTimeString() : 'recent request'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Load More Button */}
                  {hasMore && availableDates.length > 0 && !availabilityLoading && (
                    <div className="flex justify-center">
                      <button 
                        onClick={loadMore}
                        className="text-sm text-[var(--primary-100)] bg-[var(--primary-100)]/10 px-4 py-2 rounded-lg hover:bg-[var(--primary-100)]/20 transition-colors"
                        disabled={availabilityLoading}
                      >
                        Load more availability
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Additional Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-base font-medium text-[var(--black-60)] font-inter">
                Additional Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                    What would you like to discuss? (Optional)
                  </label>
                  <Textarea
                    placeholder="Briefly describe your goals for this session..."
                    value={formData.clientNotes}
                    onChange={(e) => handleInputChange("clientNotes", e.target.value)}
                    className="min-h-[100px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 py-3 text-base placeholder:text-[var(--black-2)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>

                {/* Session Summary */}
                <div className="bg-[var(--secondary-10)] rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-[var(--black-60)]">Session Summary</h4>
                  <div className="text-sm text-[var(--black-40)] space-y-1">
                    <div>Type: {sessionType === 'PERSONAL' ? 'Personal Session' : 'Webinar'}</div>
                    <div>Date: {formData.selectedDate ? new Date(formData.selectedDate).toLocaleDateString() : (
                      <span className="text-amber-600 font-medium">To be scheduled by consultant</span>
                    )}</div>
                    <div>Time: {formData.selectedTime ? formatTime(formData.selectedTime) : (
                      <span className="text-amber-600 font-medium">To be scheduled by consultant</span>
                    )}</div>
                    <div>Duration: {formData.duration} minutes</div>
                    <div className="font-medium text-[var(--black-60)]">
                      Total: ₹{amount.toLocaleString('en-IN')}
                    </div>
                    {(!formData.selectedDate || !formData.selectedTime) && (
                      <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">
                        📅 The consultant will contact you directly to schedule this session based on mutual availability.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-12 border-2 border-[var(--primary-100)] text-[var(--primary-100)] hover:bg-[var(--primary-100)]/5 rounded-xl"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Back
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex-1 h-12 bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl disabled:opacity-50"
                style={{ fontFamily: "Inter, sans-serif" }}
                title={
                  currentStep === 1 && availabilityLoading ? "Loading availability..." :
                  currentStep === 1 && availabilityError && availableDates.length === 0 ? "Connection error - you can retry or continue anyway" :
                  currentStep === 1 && availableDates.length === 0 ? "No availability found - you can continue with manual booking" :
                  currentStep === 2 && !formData.selectedDate && availableDates.length > 0 ? "Please select a date and time" :
                  !isStepValid() ? "Please complete all required fields" : ""
                }
              >
                {currentStep === 1 && availabilityLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : currentStep === 1 && availabilityError && availableDates.length === 0 ? (
                  'Continue Anyway'
                ) : currentStep === 1 && availableDates.length === 0 ? (
                  'Continue'
                ) : (
                  'Next'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 h-12 bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking Session...
                  </>
                ) : (
                  'Book Session'
                )}
              </Button>
            )}

            {currentStep === 1 && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-12 border-2 border-[var(--primary-100)] text-[var(--primary-100)] hover:bg-[var(--primary-100)]/5 rounded-xl"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}