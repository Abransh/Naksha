// apps/consultant-dashboard/src/components/modals/availability-modal.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  X,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Save,
  Calendar,
} from "lucide-react";
import { availabilityApi, WeeklyAvailabilityPattern } from "@/lib/api";

interface AvailabilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface WeeklyPattern {
  dayOfWeek: number;
  sessionType: 'PERSONAL' | 'WEBINAR';
  slots: TimeSlot[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const time = `${hour.toString().padStart(2, '0')}:00`;
  const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { value: time, label: displayTime };
});

export function AvailabilityModal({
  open,
  onOpenChange,
}: AvailabilityModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState<'PERSONAL' | 'WEBINAR'>('PERSONAL');
  const [patterns, setPatterns] = useState<WeeklyPattern[]>([]);

  // Initialize patterns for all days
  useEffect(() => {
    if (open) {
      const initialPatterns = DAYS_OF_WEEK.map(day => ({
        dayOfWeek: day.value,
        sessionType: selectedSessionType,
        slots: [],
      }));
      setPatterns(initialPatterns);
      loadExistingPatterns();
    }
  }, [open, selectedSessionType]);

  const loadExistingPatterns = async () => {
    try {
      setIsLoading(true);
      const existingPatterns = await availabilityApi.getPatterns();
      
      // Convert API patterns to internal format
      const convertedPatterns = DAYS_OF_WEEK.map(day => ({
        dayOfWeek: day.value,
        sessionType: selectedSessionType,
        slots: existingPatterns
          .filter(pattern => pattern.dayOfWeek === day.value && pattern.sessionType === selectedSessionType)
          .map(pattern => ({
            id: pattern.id || `slot_${Date.now()}_${Math.random()}`,
            startTime: pattern.startTime,
            endTime: pattern.endTime,
            isActive: pattern.isActive,
          }))
      }));
      
      setPatterns(convertedPatterns);
    } catch (error) {
      console.error('Failed to load patterns:', error);
      toast.error('Failed to load existing availability patterns');
    } finally {
      setIsLoading(false);
    }
  };

  const addTimeSlot = useCallback((dayOfWeek: number) => {
    setPatterns(prev => prev.map(pattern => {
      if (pattern.dayOfWeek === dayOfWeek && pattern.sessionType === selectedSessionType) {
        const newSlot: TimeSlot = {
          id: `slot_${Date.now()}_${Math.random()}`,
          startTime: '09:00',
          endTime: '17:00', // Default 8-hour availability block
          isActive: true,
        };
        return {
          ...pattern,
          slots: [...pattern.slots, newSlot]
        };
      }
      return pattern;
    }));
  }, [selectedSessionType]);

  const removeTimeSlot = useCallback((dayOfWeek: number, slotId: string) => {
    setPatterns(prev => prev.map(pattern => {
      if (pattern.dayOfWeek === dayOfWeek && pattern.sessionType === selectedSessionType) {
        return {
          ...pattern,
          slots: pattern.slots.filter(slot => slot.id !== slotId)
        };
      }
      return pattern;
    }));
  }, [selectedSessionType]);

  const updateTimeSlot = useCallback((dayOfWeek: number, slotId: string, field: keyof TimeSlot, value: any) => {
    setPatterns(prev => prev.map(pattern => {
      if (pattern.dayOfWeek === dayOfWeek && pattern.sessionType === selectedSessionType) {
        return {
          ...pattern,
          slots: pattern.slots.map(slot => {
            if (slot.id === slotId) {
              const updatedSlot = { ...slot, [field]: value };
              
              // Allow consultants to set their own time ranges
              // Backend will generate individual hourly slots from this range
              
              return updatedSlot;
            }
            return slot;
          })
        };
      }
      return pattern;
    }));
  }, [selectedSessionType]);

  const validateTimeSlots = (): boolean => {
    for (const pattern of patterns) {
      if (pattern.sessionType !== selectedSessionType) continue;
      
      for (const slot of pattern.slots) {
        if (slot.startTime >= slot.endTime) {
          toast.error(`Invalid time range on ${DAYS_OF_WEEK[pattern.dayOfWeek].label}: End time must be after start time`);
          return false;
        }
      }

      // Check for overlapping slots
      const activeSlots = pattern.slots.filter(slot => slot.isActive);
      for (let i = 0; i < activeSlots.length; i++) {
        for (let j = i + 1; j < activeSlots.length; j++) {
          const slot1 = activeSlots[i];
          const slot2 = activeSlots[j];
          
          if (
            (slot1.startTime < slot2.endTime && slot1.endTime > slot2.startTime) ||
            (slot2.startTime < slot1.endTime && slot2.endTime > slot1.startTime)
          ) {
            toast.error(`Overlapping time slots on ${DAYS_OF_WEEK[pattern.dayOfWeek].label}`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateTimeSlots()) return;

    try {
      setIsLoading(true);
      
      // Prepare patterns for API
      const patternsToSave = patterns
        .filter(pattern => pattern.sessionType === selectedSessionType && pattern.slots.length > 0)
        .flatMap(pattern => 
          pattern.slots
            .filter(slot => slot.isActive)
            .map(slot => ({
              sessionType: pattern.sessionType,
              dayOfWeek: pattern.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isActive: slot.isActive,
              timezone: 'Asia/Kolkata'
            }))
        );

      // Save patterns to API
      await availabilityApi.saveBulkPatterns(patternsToSave);
      
      // Generate slots for the next 30 days from patterns
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);
      
      const startDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      try {
        const slotsResult = await availabilityApi.generateSlots({
          startDate: startDateStr,
          endDate: endDateStr,
          sessionType: selectedSessionType
        });
        
        toast.success(`Availability schedule saved! Generated ${slotsResult.slotsCreated} bookable slots.`);
      } catch (slotsError) {
        console.warn('Patterns saved but slot generation failed:', slotsError);
        toast.success('Availability schedule saved! Note: Automatic slot generation failed - you may need to generate slots manually.');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save patterns:', error);
      toast.error('Failed to save availability schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPatternSlots = (dayOfWeek: number) => {
    const pattern = patterns.find(p => p.dayOfWeek === dayOfWeek && p.sessionType === selectedSessionType);
    return pattern?.slots || [];
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl text-white font-semibold text-[var(--black-60)]">
              Set Your Availability Schedule
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Type Selector */}
          <div className="flex text-black items-center gap-4">
            <label className="text-sm font-medium text-[var(--black-60)]">
              Session Type:
            </label>
            <Select
              value={selectedSessionType}
              onValueChange={(value: 'PERSONAL' | 'WEBINAR') => setSelectedSessionType(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSONAL">Personal Sessions</SelectItem>
                <SelectItem value="WEBINAR">Webinar Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weekly Schedule Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--black-60)] flex items-center gap-2">
              <Calendar size={20} />
              Weekly Schedule for {selectedSessionType === 'PERSONAL' ? 'Personal Sessions' : 'Webinar Sessions'}
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = getCurrentPatternSlots(day.value);
                
                return (
                  <Card key={day.value} className="border border-[var(--stroke)]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-[var(--black-60)]">
                          {day.label}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(day.value)}
                          className="flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Add Time Slot
                        </Button>
                      </div>

                      {daySlots.length === 0 ? (
                        <div className="text-center py-8 text-[var(--black-40)]">
                          No time slots set for this day
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {daySlots.map((slot) => (
                            <div key={slot.id} className="flex items-center gap-3 p-3 bg-[var(--input-defaultBackground)] rounded-lg">
                              {/* Start Time */}
                              <div className="flex-1">
                                <label className="text-xs text-[var(--black-40)] mb-1 block">
                                  Start Time
                                </label>
                                <Select
                                  value={slot.startTime}
                                  onValueChange={(value) => updateTimeSlot(day.value, slot.id, 'startTime', value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem key={time.value} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* End Time */}
                              <div className="flex-1">
                                <label className="text-xs text-[var(--black-40)] mb-1 block">
                                  End Time
                                </label>
                                <Select
                                  value={slot.endTime}
                                  onValueChange={(value) => updateTimeSlot(day.value, slot.id, 'endTime', value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem key={time.value} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Active Toggle */}
                              <div className="flex flex-col items-center">
                                <label className="text-xs text-[var(--black-40)] mb-1">
                                  Active
                                </label>
                                <Switch
                                  checked={slot.isActive}
                                  onCheckedChange={(checked) => updateTimeSlot(day.value, slot.id, 'isActive', checked)}
                                />
                              </div>

                              {/* Remove Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTimeSlot(day.value, slot.id)}
                                className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex text-red-600 justify-end gap-3 pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Schedule
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}