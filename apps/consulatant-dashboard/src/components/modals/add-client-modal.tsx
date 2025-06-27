"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddClientModalProps {
  children: React.ReactNode;
}

export function AddClientModal({ children }: AddClientModalProps) {
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

  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    // Handle form submission here
    console.log("Form data:", formData);
    setIsOpen(false);
    // Reset form
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
  };

  const handleCancel = () => {
    setIsOpen(false);
    // Reset form
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
                  className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
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
                  className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>

              {/* Phone Number */}
              <div>
                <div className="flex gap-1.5">
                  {/* Country Code */}
                  <div className="w-[142px] h-[52px] bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center gap-2">
                    <img
                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/476fcd1a2c2c98552051d9cbd7e37671aa260087?width=70"
                      alt="Nigeria Flag"
                      className="w-[35px] h-6"
                    />
                    <div className="flex-1">
                      <span
                        className="text-base text-[var(--black-2)]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        +234
                      </span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 17 16" fill="none">
                      <path
                        d="M13.1668 5.6665L8.50016 10.3332L3.8335 5.6665"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Phone Input */}
                  <Input
                    placeholder="8023456789"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              </div>

              {/* Add Address Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <span
                    className="text-sm text-[var(--black-5)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Add Address
                  </span>
                  <button
                    onClick={() =>
                      handleInputChange("addAddress", !formData.addAddress)
                    }
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{
                      backgroundColor: formData.addAddress
                        ? "rgba(85, 112, 241, 0.40)"
                        : "rgba(85, 112, 241, 0.12)",
                    }}
                  >
                    <div
                      className="absolute w-4 h-4 rounded-full transition-transform"
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
                      className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
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
                      className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base placeholder:text-[var(--black-2)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                  </div>

                  {/* Country and State */}
                  <div className="flex gap-3">
                    {/* Country */}
                    <div className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center justify-between">
                      <span
                        className="text-base text-[var(--black-2)]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Country
                      </span>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 9L12 15L18 9"
                          stroke="#5E6366"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    {/* State */}
                    <div className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center justify-between">
                      <span
                        className="text-base text-[var(--black-2)]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        State
                      </span>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 9L12 15L18 9"
                          stroke="#5E6366"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
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
                    <div className="flex items-center gap-5">
                      <span
                        className="text-sm"
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
                        className="relative w-10 h-5 rounded-full transition-colors"
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
              className="flex-1 h-14 border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-xl text-xl font-normal"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-14 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl text-xl font-normal"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
