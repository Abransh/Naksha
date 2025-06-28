// apps/consultant-dashboard/src/components/modals/create-session-modal.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSessions } from "@/hooks/useSessions";
import { useClients } from "@/hooks/useClients";
import { clientApi } from "@/lib/api";
import { toast } from "sonner";
import {
  X,
  Calendar,
  Clock,
  Search,
  ShoppingBag,
  Loader2,
  Plus,
  User,
} from "lucide-react";

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionFormData {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  title: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  amount: number;
  platform: 'ZOOM' | 'MEET' | 'TEAMS';
  notes: string;
  paymentMethod: 'online' | 'cash' | 'bank_transfer';
}

export function CreateSessionModal({
  open,
  onOpenChange,
}: CreateSessionModalProps) {
  const [isNewClient, setIsNewClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    title: '',
    sessionType: 'PERSONAL',
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 60,
    amount: 0,
    platform: 'ZOOM',
    notes: '',
    paymentMethod: 'online',
  });

  const { createSession } = useSessions();
  const { clients, isLoading: clientsLoading, refresh: refreshClients } = useClients();

  // Generate default date (tomorrow)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];
    
    setFormData(prev => ({
      ...prev,
      scheduledDate: defaultDate,
      scheduledTime: '10:00'
    }));
  }, []);

  // Update title when session type changes
  useEffect(() => {
    const sessionTypeLabel = formData.sessionType === 'PERSONAL' ? 'Consultation' : 'Webinar';
    setFormData(prev => ({
      ...prev,
      title: `${sessionTypeLabel} Session`,
      durationMinutes: formData.sessionType === 'PERSONAL' ? 60 : 120,
      amount: formData.sessionType === 'PERSONAL' ? 1500 : 3000, // Default pricing
    }));
  }, [formData.sessionType]);

  const handleInputChange = useCallback((field: keyof SessionFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleClientSelect = useCallback((clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phoneNumber || '',
      }));
    }
  }, [clients]);

  // Create new client
  const handleCreateClient = useCallback(async () => {
    if (!formData.clientName || !formData.clientEmail) {
      toast.error('Please fill in client name and email');
      return;
    }

    try {
      setIsCreatingClient(true);
      const newClient = await clientApi.createClient({
        name: formData.clientName,
        email: formData.clientEmail,
        phoneNumber: formData.clientPhone,
      });

      setFormData(prev => ({
        ...prev,
        clientId: newClient.id,
      }));

      await refreshClients();
      toast.success('New client created successfully');
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Failed to create client');
    } finally {
      setIsCreatingClient(false);
    }
  }, [formData.clientName, formData.clientEmail, formData.clientPhone, refreshClients]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.clientId && !isNewClient) {
      toast.error('Please select a client');
      return;
    }

    if (isNewClient && (!formData.clientName || !formData.clientEmail)) {
      toast.error('Please fill in client information');
      return;
    }

    if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);

      let clientId = formData.clientId;

      // Create client if new
      if (isNewClient && !clientId) {
        await handleCreateClient();
        clientId = formData.clientId; // This should be set after creating client
        if (!clientId) {
          toast.error('Failed to create client');
          return;
        }
      }

      // Create session
      await createSession({
        clientId,
        title: formData.title,
        sessionType: formData.sessionType,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        durationMinutes: formData.durationMinutes,
        amount: formData.amount,
        platform: formData.platform,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
      });

      toast.success('Session created successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [formData, isNewClient, createSession, handleCreateClient, onOpenChange]);

  const resetForm = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];
    
    setFormData({
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      title: '',
      sessionType: 'PERSONAL',
      scheduledDate: defaultDate,
      scheduledTime: '10:00',
      durationMinutes: 60,
      amount: 1500,
      platform: 'ZOOM',
      notes: '',
      paymentMethod: 'online',
    });
    setIsNewClient(false);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    resetForm();
  }, [onOpenChange, resetForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[90vw] max-h-[90vh] p-6 bg-white rounded-xl border-0 shadow-lg overflow-y-auto">
        <DialogTitle className="sr-only">Create New Session</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-black font-poppins">
            Create New Session
          </h2>
          <button
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--secondary-30)] hover:bg-[var(--secondary-30)]/80"
          >
            <X size={16} className="text-[var(--black-100)]" />
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Session Details */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-[var(--black-30)] font-inter">
                Session Details
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--black-60)] font-inter">
                  New Client
                </span>
                <Switch
                  checked={isNewClient}
                  onCheckedChange={setIsNewClient}
                  className="w-10 h-5"
                />
              </div>
            </div>

            {/* Client Selection/Creation */}
            {isNewClient ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-[var(--black-60)]">
                  <User size={16} />
                  <span>New Client Information</span>
                </div>
                
                <Input
                  placeholder="Client Name *"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4"
                />
                
                <Input
                  type="email"
                  placeholder="Client Email *"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4"
                />
                
                <Input
                  type="tel"
                  placeholder="Client Phone"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4"
                />
              </div>
            ) : (
              <div>
                <Select 
                  value={formData.clientId} 
                  onValueChange={handleClientSelect}
                  disabled={clientsLoading}
                >
                  <SelectTrigger className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4">
                    <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select Client *"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                    {clients.length === 0 && (
                      <SelectItem value="no-clients" disabled>
                        No clients found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Session Type & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                  Session Type *
                </label>
                <Select 
                  value={formData.sessionType} 
                  onValueChange={(value: 'PERSONAL' | 'WEBINAR') => handleInputChange('sessionType', value)}
                >
                  <SelectTrigger className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONAL">Personal Session</SelectItem>
                    <SelectItem value="WEBINAR">Webinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                  Payment Method
                </label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value: 'online' | 'cash' | 'bank_transfer') => handleInputChange('paymentMethod', value)}
                >
                  <SelectTrigger className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online Payment</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                Session Date & Time *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Calendar
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--black-40)]"
                  />
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                    className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-4"
                  />
                </div>
                <div className="relative">
                  <Clock
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--black-40)]"
                  />
                  <Input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                    className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 pr-4"
                  />
                </div>
              </div>
            </div>

            {/* Duration & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', Number(e.target.value))}
                  className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4"
                  min="15"
                  max="480"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                  Amount (₹)
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                  className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4"
                  min="0"
                />
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                Meeting Platform
              </label>
              <Select 
                value={formData.platform} 
                onValueChange={(value: 'ZOOM' | 'MEET' | 'TEAMS') => handleInputChange('platform', value)}
              >
                <SelectTrigger className="h-12 bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZOOM">Zoom</SelectItem>
                  <SelectItem value="MEET">Google Meet</SelectItem>
                  <SelectItem value="TEAMS">Microsoft Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--black-60)] mb-2">
                Session Notes
              </label>
              <Textarea
                placeholder="Add any special notes for this session..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="min-h-[100px] bg-[var(--input-defaultBackground)] border-0 rounded-lg p-4 resize-none"
              />
            </div>
          </div>

          {/* Right Side - Session Summary */}
          <div className="space-y-6">
            <h3 className="text-base font-medium text-[var(--black-30)] font-inter">
              Session Summary
            </h3>

            <div className="bg-[var(--secondary-10)] rounded-lg p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--black-60)]">Session Type:</span>
                  <span className="text-sm font-medium text-[var(--black-80)]">
                    {formData.sessionType === 'PERSONAL' ? 'Personal Session' : 'Webinar'}
                  </span>
                </div>
                
                {formData.clientName && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--black-60)]">Client:</span>
                    <span className="text-sm font-medium text-[var(--black-80)]">
                      {formData.clientName}
                    </span>
                  </div>
                )}
                
                {formData.scheduledDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--black-60)]">Date:</span>
                    <span className="text-sm font-medium text-[var(--black-80)]">
                      {new Date(formData.scheduledDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
                
                {formData.scheduledTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--black-60)]">Time:</span>
                    <span className="text-sm font-medium text-[var(--black-80)]">
                      {formData.scheduledTime}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--black-60)]">Duration:</span>
                  <span className="text-sm font-medium text-[var(--black-80)]">
                    {formData.durationMinutes} minutes
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--black-60)]">Platform:</span>
                  <span className="text-sm font-medium text-[var(--black-80)]">
                    {formData.platform}
                  </span>
                </div>
                
                <div className="border-t border-[var(--stroke)] pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-[var(--black-80)]">Total Amount:</span>
                    <span className="text-base font-semibold text-[var(--primary-100)]">
                      ₹{formData.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Important Notes:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Meeting link will be generated automatically</li>
                <li>• Client will receive confirmation email</li>
                <li>• You can modify session details later</li>
                <li>• Payment status can be updated manually</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[var(--stroke)]">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || isCreatingClient}
            className="px-6 py-3 rounded-xl border-2 border-[var(--primary-100)] text-[var(--primary-100)] hover:bg-[var(--primary-100)]/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isCreatingClient}
            className="px-6 py-3 rounded-xl bg-[var(--primary-100)] text-white hover:bg-[var(--primary-100)]/90"
          >
            {isLoading || isCreatingClient ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                {isCreatingClient ? 'Creating Client...' : 'Creating Session...'}
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Create Session
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}