"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  Building2,
  Edit3,
  Save,
  X,
  Check,
  Loader2,
  DollarSign
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ConsultantData } from "@/lib/adminApi";

interface EditableConsultantRowProps {
  consultant: ConsultantData;
  onStatusUpdate: (id: string, field: 'isEmailVerified' | 'isApprovedByAdmin' | 'isActive', value: boolean) => void;
  onDataUpdate: (id: string, updates: Partial<ConsultantData>) => Promise<void>;
  isUpdating: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
}

interface EditableFields {
  personalSessionPrice: number | null;
  webinarSessionPrice: number | null;
  consultancySector: string;
  phoneNumber: string;
  experienceMonths: number;
}

const EditableConsultantRow: React.FC<EditableConsultantRowProps> = ({
  consultant,
  onStatusUpdate,
  onDataUpdate,
  isUpdating,
  isSelected = false,
  onSelectionChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<EditableFields>({
    personalSessionPrice: consultant.personalSessionPrice || null,
    webinarSessionPrice: consultant.webinarSessionPrice || null,
    consultancySector: consultant.consultancySector || '',
    phoneNumber: consultant.phoneNumber || '',
    experienceMonths: consultant.experienceMonths || 0
  });
  const [errors, setErrors] = useState<Partial<EditableFields>>({});

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const validateFields = (): boolean => {
    const newErrors: Partial<EditableFields> = {};

    if (editValues.personalSessionPrice !== null && editValues.personalSessionPrice < 0) {
      newErrors.personalSessionPrice = -1; // Use -1 to indicate error
    }

    if (editValues.webinarSessionPrice !== null && editValues.webinarSessionPrice < 0) {
      newErrors.webinarSessionPrice = -1;
    }

    if (editValues.experienceMonths < 0) {
      newErrors.experienceMonths = -1;
    }

    if (editValues.phoneNumber && !/^[\d\s\-\+\(\)]+$/.test(editValues.phoneNumber)) {
      newErrors.phoneNumber = '';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditValues({
      personalSessionPrice: consultant.personalSessionPrice || null,
      webinarSessionPrice: consultant.webinarSessionPrice || null,
      consultancySector: consultant.consultancySector || '',
      phoneNumber: consultant.phoneNumber || '',
      experienceMonths: consultant.experienceMonths || 0
    });
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({
      personalSessionPrice: consultant.personalSessionPrice || null,
      webinarSessionPrice: consultant.webinarSessionPrice || null,
      consultancySector: consultant.consultancySector || '',
      phoneNumber: consultant.phoneNumber || '',
      experienceMonths: consultant.experienceMonths || 0
    });
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateFields()) {
      return;
    }

    setIsSaving(true);
    try {
      await onDataUpdate(consultant.id, editValues);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update consultant:', error);
      // Error handling would typically show a toast notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof EditableFields, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field] !== undefined) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Status toggle component
  const StatusToggle = ({ 
    label, 
    checked, 
    onChange, 
    disabled = false,
    variant = "default"
  }: { 
    label: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void; 
    disabled?: boolean;
    variant?: "default" | "success" | "warning" | "danger";
  }) => {
    const getVariantClasses = () => {
      switch (variant) {
        case "success": return "data-[state=checked]:bg-green-600";
        case "warning": return "data-[state=checked]:bg-yellow-600";
        case "danger": return "data-[state=checked]:bg-red-600";
        default: return "data-[state=checked]:bg-blue-600";
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          className={getVariantClasses()}
        />
        <label className="text-sm font-medium">{label}</label>
      </div>
    );
  };

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
      {/* Selection Checkbox */}
      <td className="px-4 py-4 w-12">
        {onSelectionChange && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange(consultant.id, checked as boolean)}
          />
        )}
      </td>

      {/* Basic Info */}
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          {consultant.profilePhotoUrl ? (
            <img
              src={consultant.profilePhotoUrl}
              alt={`${consultant.firstName} ${consultant.lastName}`}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {consultant.firstName} {consultant.lastName}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {consultant.email}
            </div>
          </div>
        </div>
      </td>

      {/* Contact & Sector */}
      <td className="px-4 py-4">
        <div className="space-y-2">
          <div className="text-sm flex items-center gap-1">
            <Phone className="h-3 w-3 text-gray-400" />
            {isEditing ? (
              <Input
                value={editValues.phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                placeholder="Phone number"
                className={`h-6 text-xs ${errors.phoneNumber !== undefined ? 'border-red-500' : ''}`}
              />
            ) : (
              <span>{consultant.phoneCountryCode} {consultant.phoneNumber}</span>
            )}
          </div>
          <div className="text-sm flex items-center gap-1">
            <Building2 className="h-3 w-3 text-gray-400" />
            {isEditing ? (
              <Input
                value={editValues.consultancySector}
                onChange={(e) => handleFieldChange('consultancySector', e.target.value)}
                placeholder="Consultancy sector"
                className="h-6 text-xs"
              />
            ) : (
              <span>{consultant.consultancySector || 'Not specified'}</span>
            )}
          </div>
        </div>
      </td>

      {/* Stats & Pricing */}
      <td className="px-4 py-4">
        <div className="space-y-2 text-sm">
          <div>Sessions: {consultant.stats?.totalSessions || 0}</div>
          <div>Clients: {consultant.stats?.totalClients || 0}</div>
          <div className="flex items-center gap-1">
            <span>Experience:</span>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editValues.experienceMonths}
                  onChange={(e) => handleFieldChange('experienceMonths', parseInt(e.target.value) || 0)}
                  placeholder="Months"
                  className={`h-6 w-16 text-xs ${errors.experienceMonths !== undefined ? 'border-red-500' : ''}`}
                  min="0"
                />
                <span className="text-xs">months</span>
              </div>
            ) : (
              <span>{Math.floor((consultant.experienceMonths || 0) / 12)}y {(consultant.experienceMonths || 0) % 12}m</span>
            )}
          </div>
        </div>
      </td>

      {/* Pricing */}
      <td className="px-4 py-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">Personal:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editValues.personalSessionPrice || ''}
                onChange={(e) => handleFieldChange('personalSessionPrice', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="₹0"
                className={`h-6 w-20 text-xs ${errors.personalSessionPrice !== undefined ? 'border-red-500' : ''}`}
                min="0"
              />
            ) : (
              <span>{formatCurrency(consultant.personalSessionPrice)}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">Webinar:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editValues.webinarSessionPrice || ''}
                onChange={(e) => handleFieldChange('webinarSessionPrice', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="₹0"
                className={`h-6 w-20 text-xs ${errors.webinarSessionPrice !== undefined ? 'border-red-500' : ''}`}
                min="0"
              />
            ) : (
              <span>{formatCurrency(consultant.webinarSessionPrice)}</span>
            )}
          </div>
        </div>
      </td>

      {/* Status Toggles */}
      <td className="px-4 py-4">
        <div className="space-y-3">
          <StatusToggle
            label="Email Verified"
            checked={consultant.isEmailVerified}
            onChange={(value) => onStatusUpdate(consultant.id, "isEmailVerified", value)}
            disabled={isUpdating || isEditing}
            variant="success"
          />
          <StatusToggle
            label="Admin Approved"
            checked={consultant.isApprovedByAdmin}
            onChange={(value) => onStatusUpdate(consultant.id, "isApprovedByAdmin", value)}
            disabled={isUpdating || isEditing}
            variant="warning"
          />
          <StatusToggle
            label="Active"
            checked={consultant.isActive}
            onChange={(value) => onStatusUpdate(consultant.id, "isActive", value)}
            disabled={isUpdating || isEditing}
            variant="default"
          />
        </div>
      </td>

      {/* Metadata & Actions */}
      <td className="px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={consultant.profileCompleted ? "default" : "secondary"}>
              Profile: {consultant.profileCompleted ? "Complete" : "Incomplete"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{consultant.status}</Badge>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Joined: {formatDate(consultant.createdAt)}
          </div>
          {consultant.lastLoginAt && (
            <div className="text-xs text-gray-500">
              Last login: {formatDate(consultant.lastLoginAt)}
            </div>
          )}
          
          {/* Edit Actions */}
          <div className="flex items-center gap-1 mt-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  variant="default"
                  className="h-7 px-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEdit}
                disabled={isUpdating}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default EditableConsultantRow;