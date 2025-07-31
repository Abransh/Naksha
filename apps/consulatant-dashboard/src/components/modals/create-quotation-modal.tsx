// apps/consulatant-dashboard/src/components/modals/create-quotation-modal.tsx

"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = `${API_BASE_URL}/api/v1`;

interface CreateQuotationModalProps {
  children: React.ReactNode;
}

export function CreateQuotationModal({ children }: CreateQuotationModalProps) {
  const [formData, setFormData] = useState({
    quotationName: "",
    clientName: "",
    clientEmail: "",
    category: "",
    baseAmount: "",
    gstNumber: "",
    taxPercentage: 0,
    description: "",
    notes: "",
    expiryDays: 30,
    addGst: false,
    addExpiryDate: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.quotationName.trim()) {
      newErrors.quotationName = "Quotation name is required";
    }
    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }
    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = "Client email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = "Please enter a valid email address";
    }
    if (!formData.baseAmount || parseFloat(formData.baseAmount) <= 0) {
      newErrors.baseAmount = "Please enter a valid amount";
    }
    
    // GST number validation (Indian GST format: 15 characters)
    if (formData.addGst && formData.gstNumber) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gstNumber)) {
        newErrors.gstNumber = "Please enter a valid GST number (15 characters)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createQuotation = async (isDraft: boolean = true) => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Prepare quotation data for API
      const quotationData = {
        quotationName: formData.quotationName,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        description: formData.description,
        baseAmount: parseFloat(formData.baseAmount),
        taxPercentage: formData.addGst ? formData.taxPercentage : 0,
        gstNumber: formData.addGst ? formData.gstNumber : null,
        currency: "INR",
        expiryDays: formData.addExpiryDate ? formData.expiryDays : 30,
        notes: formData.notes,
      };

      // Create quotation via API
      const response = await fetch(`${API_URL}/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(quotationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create quotation');
      }

      const result = await response.json();
      const quotationId = result.data.quotation.id;

      // If not draft, send the quotation via email
      if (!isDraft) {
        const sendResponse = await fetch(`${API_URL}/quotations/${quotationId}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            emailMessage: "", // Could add custom message field later
            includeAttachment: false,
          }),
        });

        if (!sendResponse.ok) {
          const errorData = await sendResponse.json();
          throw new Error(errorData.message || 'Failed to send quotation');
        }
      }

      // Show success message
      console.log(isDraft ? '✅ Quotation saved as draft' : '✅ Quotation sent to client');
      
      // Reset form and close modal
      setFormData({
        quotationName: "",
        clientName: "",
        clientEmail: "",
        category: "",
        baseAmount: "",
        gstNumber: "",
        taxPercentage: 0,
        description: "",
        notes: "",
        expiryDays: 30,
        addGst: false,
        addExpiryDate: false,
      });
      setErrors({});
      setIsOpen(false);

      // Refresh quotations list (you may want to add a callback prop for this)
      window.location.reload();

    } catch (error) {
      console.error('❌ Error creating quotation:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsDraft = () => {
    createQuotation(true);
  };

  const handleSaveAndShare = () => {
    createQuotation(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 bg-white border border-[var(--stroke)] rounded-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--stroke)]">
          <h2
            className="text-xl font-medium text-[var(--black-100)]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            New Quotations Item
          </h2>
          <div className="flex items-center gap-3">
            {/* Error message */}
            {errors.submit && (
              <div className="text-sm text-red-600 font-medium">
                {errors.submit}
              </div>
            )}

            {/* Save as Draft Button */}
            <Button
              onClick={handleSaveAsDraft}
              disabled={isLoading}
              className="bg-[var(--black-100)] hover:bg-[var(--black-100)]/90 text-white font-normal px-4 py-2 h-9 rounded-lg flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {isLoading ? "Saving..." : "Save as Draft"}
            </Button>

            {/* Save & Share Button */}
            <Button
              onClick={handleSaveAndShare}
              disabled={isLoading}
              className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white font-normal px-4 py-2 h-9 rounded-lg disabled:opacity-50"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {isLoading ? "Sending..." : "Save & Share with Client"}
            </Button>
          </div>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column - Basic Information */}
          <div className="space-y-5">
            {/* Quotation Name */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Quotation Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter quotation name"
                value={formData.quotationName}
                onChange={(e) =>
                  handleInputChange("quotationName", e.target.value)
                }
                className={`h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] ${
                  errors.quotationName ? "border-red-500" : ""
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              {errors.quotationName && (
                <p className="text-sm text-red-600">{errors.quotationName}</p>
              )}
            </div>

            {/* Client Name */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Client Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter client name"
                value={formData.clientName}
                onChange={(e) =>
                  handleInputChange("clientName", e.target.value)
                }
                className={`h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] ${
                  errors.clientName ? "border-red-500" : ""
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              {errors.clientName && (
                <p className="text-sm text-red-600">{errors.clientName}</p>
              )}
            </div>

            {/* Client Email */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Client Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="Enter client email"
                value={formData.clientEmail}
                onChange={(e) =>
                  handleInputChange("clientEmail", e.target.value)
                }
                className={`h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] ${
                  errors.clientEmail ? "border-red-500" : ""
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              {errors.clientEmail && (
                <p className="text-sm text-red-600">{errors.clientEmail}</p>
              )}
            </div>

            {/* Base Amount */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Base Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="Enter amount in ₹"
                value={formData.baseAmount}
                onChange={(e) =>
                  handleInputChange("baseAmount", e.target.value)
                }
                className={`h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] ${
                  errors.baseAmount ? "border-red-500" : ""
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              {errors.baseAmount && (
                <p className="text-sm text-red-600">{errors.baseAmount}</p>
              )}
            </div>

            {/* GST Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Add GST
                </label>
                <Switch
                  checked={formData.addGst}
                  onCheckedChange={(checked) =>
                    handleInputChange("addGst", checked)
                  }
                />
              </div>
              
              {formData.addGst && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-[var(--black-100)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter GST number (15 characters)"
                      value={formData.gstNumber}
                      onChange={(e) =>
                        handleInputChange("gstNumber", e.target.value.toUpperCase())
                      }
                      maxLength={15}
                      className={`h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] ${
                        errors.gstNumber ? "border-red-500" : ""
                      }`}
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                    {errors.gstNumber && (
                      <p className="text-sm text-red-600">{errors.gstNumber}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-[var(--black-100)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Tax Percentage
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter tax percentage (e.g., 18)"
                      value={formData.taxPercentage}
                      onChange={(e) =>
                        handleInputChange("taxPercentage", parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      max="50"
                      step="0.1"
                      className="h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expiry Date Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Add Expiry Date
                </label>
                <Switch
                  checked={formData.addExpiryDate}
                  onCheckedChange={(checked) =>
                    handleInputChange("addExpiryDate", checked)
                  }
                />
              </div>
              
              {formData.addExpiryDate && (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[var(--black-100)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Valid for (days)
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter number of days"
                    value={formData.expiryDays}
                    onChange={(e) =>
                      handleInputChange("expiryDays", parseInt(e.target.value) || 30)
                    }
                    min="1"
                    max="365"
                    className="h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Description & Notes */}
          <div className="space-y-5">
            {/* Description */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Description
              </label>
              <Textarea
                placeholder="Enter detailed description of the service/quotation"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="min-h-32 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] resize-none"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Notes (Internal)
              </label>
              <Textarea
                placeholder="Add any internal notes about this quotation"
                value={formData.notes}
                onChange={(e) =>
                  handleInputChange("notes", e.target.value)
                }
                className="min-h-20 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] resize-none"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Final Amount Preview */}
            {formData.baseAmount && (
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Amount Breakdown
                </label>
                <div className="p-4 bg-blue-50 border text-black border-blue-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Base Amount:</span>
                      <span>₹{parseFloat(formData.baseAmount || "0").toLocaleString()}</span>
                    </div>
                    {formData.addGst && formData.taxPercentage > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Tax ({formData.taxPercentage}%):</span>
                          <span>₹{(parseFloat(formData.baseAmount || "0") * formData.taxPercentage / 100).toLocaleString()}</span>
                        </div>
                        {formData.gstNumber && (
                          <div className="text-xs text-gray-600">
                            GST No: {formData.gstNumber}
                          </div>
                        )}
                      </>
                    )}
                    <hr className="border-gray-300" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Final Amount:</span>
                      <span className="text-green-600">
                        ₹{(
                          parseFloat(formData.baseAmount || "0") *
                          (1 + (formData.addGst ? formData.taxPercentage : 0) / 100)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quotation Summary */}
            <div className="space-y-2 text-black">
              <label
                className="text-sm font-medium text-black"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Summary
              </label>
              <div className="p-3 bg-gray-50 border border-[var(--stroke)] rounded-lg text-sm">
                <div className="space-y-1">
                  <div><strong>Service:</strong> {formData.quotationName || "Not specified"}</div>
                  <div><strong>Client:</strong> {formData.clientName || "Not specified"}</div>
                  <div><strong>Email:</strong> {formData.clientEmail || "Not specified"}</div>
                  {formData.addExpiryDate && (
                    <div><strong>Valid for:</strong> {formData.expiryDays} days</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
