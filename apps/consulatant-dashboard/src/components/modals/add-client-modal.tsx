// apps/consulatant-dashboard/src/components/modals/add-client-modal.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddClientModalProps {
  children: React.ReactNode;
  onClientAdded?: () => void; // Callback to refresh client list
}

export function AddClientModal({ children, onClientAdded }: AddClientModalProps) {
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    phoneNumber: "",
    countryCode: "+234",
    addAddress: true,
    streetAddress: "",
    city: "",
    country: "",
    state: "",
    sameAsBillingAddress: false,
  });

  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry"
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }
    
    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = "Client email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = "Please enter a valid email address";
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const clientData = {
        name: formData.clientName.trim(),
        email: formData.clientEmail.trim(),
        phoneCountryCode: formData.countryCode,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.addAddress ? formData.streetAddress.trim() : undefined,
        city: formData.addAddress ? formData.city.trim() : undefined,
        state: formData.addAddress ? formData.state.trim() : undefined,
        country: formData.addAddress ? formData.country.trim() : undefined,
      };

      console.log('🔄 Creating client with data:', clientData);
      
      const newClient = await clientApi.createClient(clientData);
      
      console.log('✅ Client created successfully:', newClient);
      
      toast.success("Client added successfully!");
      
      // Close modal and reset form
      setIsOpen(false);
      resetForm();
      
      // Trigger refresh callback
      if (onClientAdded) {
        onClientAdded();
      }
    } catch (error) {
      console.error('❌ Error creating client:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create client. Please try again.';
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      clientName: "",
      clientEmail: "",
      phoneNumber: "",
      countryCode: "+234",
      addAddress: true,
      streetAddress: "",
      city: "",
      country: "",
      state: "",
      sameAsBillingAddress: false,
    });
    setErrors({});
  };

  const handleCancel = () => {
    setIsOpen(false);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-md mx-auto bg-white rounded-xl border-0 p-0 overflow-hidden">
        <div className="p-6 flex flex-col gap-7">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-medium text-black"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Add a New Client
            </h2>
        
              <div>
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
              </div>
            
          </div>

          {/* Client Information Section */}
          <div>
            <h3
              className="text-base font-medium text-[var(--black-30)] mb-7"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Client Information
            </h3>

            <div className="space-y-6">
              {/* Client Name */}
              <div>
                <Input
                  placeholder="Client Name"
                  value={formData.clientName}
                  onChange={(e) =>
                    handleInputChange("clientName", e.target.value)
                  }
                  className={`h-[52px] bg-[var(--input-defaultBackground)] text-black border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)] ${
                    errors.clientName ? 'border border-red-500' : ''
                  }`}
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
                {errors.clientName && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientName}</p>
                )}
              </div>

              {/* Client Email */}
              <div>
                <Input
                  placeholder="Client Email"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) =>
                    handleInputChange("clientEmail", e.target.value)
                  }
                  className={`h-[52px] text-black bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)] ${
                    errors.clientEmail ? 'border border-red-500' : ''
                  }`}
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
                {errors.clientEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientEmail}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <div className="flex gap-1.5">
                  {/* Country Code */}
                  <div className="w-[142px] h-[52px] text-black bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center gap-2">
                    <img
                      src="/assets/Flag_of_India.png"
                      alt="Nigeria Flag"
                      className="w-[35px] h-6"
                    />
                    <div className="flex-1">
                      <span
                        className="text-base text-black text-[var(--black-2)]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        +91
                      </span>
                    </div>
                   
                  </div>

                  {/* Phone Input */}
                  <Input
                    placeholder="8023456789"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    className={`flex-1 text-black h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)] ${
                      errors.phoneNumber ? 'border border-red-500' : ''
                    }`}
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                )}
              </div>

              {/* Add Address Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <span
                    className="text-sm text-black text-[var(--black-5)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Add Address
                  </span>
                  <button
                    onClick={() =>
                      handleInputChange("addAddress", !formData.addAddress)
                    }
                    className="relative w-10 h-5 rounded-full text-black transition-colors"
                    style={{
                      backgroundColor: formData.addAddress
                        ? "rgba(85, 112, 241, 0.40)"
                        : "rgba(85, 112, 241, 0.12)",
                    }}
                  >
                    <div
                      className="absolute w-4 h-4 text-black rounded-full transition-transform"
                      style={{
                        backgroundColor: formData.addAddress
                          ? "var(--primary)"
                          : "#BBC5CB",
                        transform: formData.addAddress
                          ? "translateX(22px)"
                          : "translateX(2px)",
                        top: "2px",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Address Fields - Show only if addAddress is true */}
              {formData.addAddress && (
                <>
                  {/* Street Address */}
                  <div>
                    <Input
                      placeholder="Building No., Street Address"
                      value={formData.streetAddress}
                      onChange={(e) =>
                        handleInputChange("streetAddress", e.target.value)
                      }
                      className="h-[52px] text-black bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <Input
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      className="h-[52px] text-black bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                  </div>

                  {/* Country and State */}
                  <div className="flex gap-3">
                    {/* Country */}
                    <div className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center justify-between">
                      <span
                        className="text-base text-black text-[var(--black-2)]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        India
                      </span>
                      
                    </div>

                    {/* State */}
                    <div className="flex-1 relative" ref={stateDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                        className="w-full h-[52px] bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center justify-between text-left"
                      >
                        <span
                          className="text-base text-[var(--black-2)]"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formData.state || "State"}
                        </span>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{
                            transform: isStateDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease-in-out",
                          }}
                        >
                          <path
                            d="M6 9L12 15L18 9"
                            stroke="#5E6366"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      
                      {isStateDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {indianStates.map((state) => (
                            <button
                              key={state}
                              type="button"
                              onClick={() => {
                                handleInputChange("state", state);
                                setIsStateDropdownOpen(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-gray-700 first:rounded-t-lg last:rounded-b-lg"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              {state}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Billing Address Section */}
                  <div className="flex items-center justify-between">
                    <h4
                      className="text-base font-medium text-[var(--black-30)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Billing Address
                    </h4>
                    <div className="flex text-black items-center gap-5">
                      <span
                        className="text-sm text-black"
                        style={{
                          fontFamily: "Inter, sans-serif",
                          color: formData.sameAsBillingAddress
                            ? "var(--black-5)"
                            : "var(--black-3)",
                        }}
                      >
                        Same as Client Address
                      </span>
                      <button
                        onClick={() =>
                          handleInputChange(
                            "sameAsBillingAddress",
                            !formData.sameAsBillingAddress,
                          )
                        }
                        className="relative w-10 h-5 rounded-full text-red-900 transition-colors"
                        style={{
                          backgroundColor: formData.sameAsBillingAddress
                            ? "rgba(85, 112, 241, 0.40)"
                            : "rgba(85, 112, 241, 0.12)",
                        }}
                      >
                        <div
                          className="absolute w-4 h-4 rounded-full transition-transform"
                          style={{
                            backgroundColor: formData.sameAsBillingAddress
                              ? "var(--primary)"
                              : "#BBC5CB",
                            transform: formData.sameAsBillingAddress
                              ? "translateX(22px)"
                              : "translateX(2px)",
                            top: "2px",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-14 border-2 border-[var(--primary)] text-gray-500   hover:bg-[var(--primary)]/5 rounded-xl text-xl font-normal"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Cancel
            </Button>
            <Button
            variant="outline"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-14 border-2 border-[var(--primary)] text-gray-500   hover:bg-[var(--primary)]/5 rounded-xl text-xl font-normal"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
