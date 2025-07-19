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
import { Loader2, Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
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
  const [isBooking, setIsBooking] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasTriggeredFetch, setHasTriggeredFetch] = useState(false);

  // Initialize availability hook but don't fetch automatically
  const { 
    availableDates, 
    availableTimesForDate, 
    isLoading: availabilityLoading, 
    error: availabilityError,
    triggerFetch,
    isCached,
    cacheTimestamp
  } = useAvailableSlots(consultantSlug, sessionType, false); // false = don't auto-fetch

  const { formatDate, formatTime } = useAvailabilityFormatter();

  const handleInputChange = (field: keyof SessionBookingData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Clear selected time when date changes
      ...(field === 'selectedDate' ? { selectedTime: '' } : {})
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      // Step 1 -> 2: Trigger availability fetch
      if (currentStep === 1) {
        setCurrentStep(2);
        // Trigger availability fetch when entering step 2
        if (!hasTriggeredFetch) {
          console.log('🎯 BookSessionModal: Entering Step 2, triggering availability fetch');
          triggerFetch();
          setHasTriggeredFetch(true);
        }
        return;
      }
      
      // Step 2 -> 3: Proceed to final step
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsBooking(true);
    try {
      const result = await bookSession({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        sessionType: formData.sessionType,
        selectedDate: formData.selectedDate || '',
        selectedTime: formData.selectedTime || '',
        duration: formData.duration,
        amount: formData.amount,
        clientNotes: formData.clientNotes + ((!formData.selectedDate || !formData.selectedTime) ? 
          '\n\nNote: Manual scheduling requested - consultant will contact directly to arrange session time.' : ''),
        consultantSlug
      });
      
      console.log('✅ Session booked successfully:', result);
      
      // Reset modal state
      setIsOpen(false);
      setCurrentStep(1);
      setHasTriggeredFetch(false);
      resetForm();
      
      // Success message based on booking type
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
      setIsBooking(false);
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
    setHasTriggeredFetch(false);
    resetForm();
  };

  // Get available time slots for the selected date
  const availableTimesForSelectedDate = formData.selectedDate 
    ? availableTimesForDate(formData.selectedDate) 
    : [];

  // Step validation - simplified logic
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Only validate form fields, no API dependency
        return formData.fullName.trim() && formData.email.trim() && formData.phone.trim();
      case 2:
        // Step 2: Allow proceeding even without selection (manual booking option)
        return true;
      case 3:
        // Step 3: Always valid (final review)
        return true;
      default:
        return false;
    }
  };

  // Helper to determine if user can proceed to booking
  const canProceedToBooking = () => {
    const hasTimeSelection = formData.selectedDate && formData.selectedTime;
    const allowsManualBooking = !hasTimeSelection && !availabilityLoading;
    return hasTimeSelection || allowsManualBooking;
  };

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

              {/* Loading State */}
              {availabilityLoading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="flex items-center gap-3 text-[var(--black-40)]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading available time slots...</span>
                  </div>
                  {isCached && (
                    <div className="text-xs text-[var(--black-30)] text-center max-w-xs">
                      Using cached data while fetching latest availability
                    </div>
                  )}
                </div>
              )}

              {/* Error State */}
              {availabilityError && !availabilityLoading && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      Unable to load availability
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {availabilityError}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => triggerFetch()}
                        className="text-sm text-amber-800 bg-amber-100 px-3 py-1 rounded hover:bg-amber-200 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No Availability State */}
              {!availabilityLoading && !availabilityError && availableDates.length === 0 && hasTriggeredFetch && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <Calendar className="h-12 w-12 text-[var(--black-30)]" />
                  <div>
                    <p className="text-base font-medium text-[var(--black-60)]">No availability found</p>
                    <p className="text-sm text-[var(--black-40)] mt-1 max-w-sm">
                      This consultant hasn't set up availability for {sessionType.toLowerCase()} sessions yet, or all slots are currently booked.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <button 
                        onClick={() => triggerFetch()}
                        className="text-sm text-[var(--primary-100)] bg-[var(--primary-100)]/10 px-4 py-2 rounded-lg hover:bg-[var(--primary-100)]/20 transition-colors"
                      >
                        Check again
                      </button>
                    </div>
                    <p className="text-xs text-[var(--black-30)] mt-3">
                      You can still continue and the consultant will contact you directly.
                    </p>
                  </div>
                </div>
              )}

              {/* Available Slots Selection */}
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
                </div>
              )}

              {/* Manual Booking Option */}
              {!availabilityLoading && (!formData.selectedDate || !formData.selectedTime) && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Manual Scheduling Available
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        If you can't find a suitable time or prefer to discuss availability directly, you can proceed without selecting a specific time slot. The consultant will contact you to arrange a convenient time.
                      </p>
                    </div>
                  </div>
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
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isBooking || !canProceedToBooking()}
                className="flex-1 h-12 bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl disabled:opacity-50"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {isBooking ? (
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