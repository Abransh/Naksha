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

  // Fetch real availability data
  const { 
    availableDates, 
    availableTimesForDate, 
    isLoading: availabilityLoading, 
    error: availabilityError,
    refetch: refetchAvailability
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
        selectedDate: formData.selectedDate,
        selectedTime: formData.selectedTime,
        duration: formData.duration,
        amount: formData.amount,
        clientNotes: formData.clientNotes,
        consultantSlug
      });
      
      console.log('✅ Session booked successfully:', result);
      
      setIsOpen(false);
      setCurrentStep(1);
      resetForm();
      
      // Show success message (to be implemented with toast)
      alert("Session booked successfully! You will receive a confirmation email shortly.");
      
    } catch (error) {
      console.error("❌ Session booking error:", error);
      alert("Failed to book session. Please try again.");
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
        return formData.selectedDate && formData.selectedTime && !availabilityLoading;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Check if we can proceed to step 2 (has availability)
  const canProceedToScheduling = () => {
    return !availabilityLoading && !availabilityError && availableDates.length > 0;
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
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-[var(--black-40)]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading availability...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {availabilityError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Failed to load availability</p>
                    <p className="text-sm text-red-600">{availabilityError}</p>
                    <button 
                      onClick={refetchAvailability}
                      className="text-sm text-red-700 underline hover:no-underline mt-1"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* No Availability State */}
              {!availabilityLoading && !availabilityError && availableDates.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Calendar className="h-12 w-12 text-[var(--black-30)]" />
                  <div>
                    <p className="text-base font-medium text-[var(--black-60)]">No availability found</p>
                    <p className="text-sm text-[var(--black-40)] mt-1">
                      This consultant hasn't set up availability for {sessionType.toLowerCase()} sessions yet.
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
                    <div>Date: {formData.selectedDate ? new Date(formData.selectedDate).toLocaleDateString() : 'Not selected'}</div>
                    <div>Time: {formData.selectedTime || 'Not selected'}</div>
                    <div>Duration: {formData.duration} minutes</div>
                    <div className="font-medium text-[var(--black-60)]">
                      Total: ₹{amount.toLocaleString('en-IN')}
                    </div>
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