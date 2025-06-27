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

interface CreateQuotationModalProps {
  children: React.ReactNode;
}

export function CreateQuotationModal({ children }: CreateQuotationModalProps) {
  const [formData, setFormData] = useState({
    quotationName: "",
    category: "",
    quotedPrice: "",
    finalPrice: "",
    quantityInStock: 1,
    quotationType: "",
    shortDescription: "",
    longDescription: "",
    addDiscount: false,
    addExpiryDate: false,
    addReturnPolicy: false,
    dateAdded: "12/12/2020",
    timeAdded: "12:00 PM",
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAsDraft = () => {
    console.log("Saving as draft:", formData);
    setIsOpen(false);
  };

  const handleSaveAndShare = () => {
    console.log("Saving and sharing:", formData);
    setIsOpen(false);
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
            {/* Save as Draft Button with Dropdown */}
            <div className="relative">
              <Button
                onClick={handleSaveAsDraft}
                className="bg-[var(--black-100)] hover:bg-[var(--black-100)]/90 text-white font-normal px-4 py-2 h-9 rounded-lg flex items-center gap-2"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Save as Draft
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </div>

            {/* Save & Share Button */}
            <Button
              onClick={handleSaveAndShare}
              className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white font-normal px-4 py-2 h-9 rounded-lg"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Save & Share with Client
            </Button>
          </div>
        </div>

        {/* Modal Body - Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-5">
            {/* Quotation Name */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Quotation Name
              </label>
              <Input
                type="text"
                placeholder="Enter quotation name"
                value={formData.quotationName}
                onChange={(e) =>
                  handleInputChange("quotationName", e.target.value)
                }
                className="h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Select Quotation Category */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Select Quotation Category
              </label>
              <Select
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger className="h-10 border-[var(--stroke)] text-[var(--black-40)]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="branding">Branding</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quoted Price and Final Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Quoted Price
                </label>
                <Input
                  type="text"
                  placeholder="₹0.00"
                  value={formData.quotedPrice}
                  onChange={(e) =>
                    handleInputChange("quotedPrice", e.target.value)
                  }
                  className="h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Final Price (Inc Tax)
                </label>
                <Input
                  type="text"
                  placeholder="₹0.00"
                  value={formData.finalPrice}
                  onChange={(e) =>
                    handleInputChange("finalPrice", e.target.value)
                  }
                  className="h-10 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>
            </div>

            {/* Quantity in Stock */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Quantity in Stock
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.quantityInStock}
                  onChange={(e) =>
                    handleInputChange(
                      "quantityInStock",
                      parseInt(e.target.value) || 1,
                    )
                  }
                  className="h-10 border-[var(--stroke)] text-[var(--black-40)] pr-12"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
                <div className="absolute right-1 top-1 flex flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      handleInputChange(
                        "quantityInStock",
                        formData.quantityInStock + 1,
                      )
                    }
                    className="w-8 h-4 flex items-center justify-center border-b border-[var(--stroke)] hover:bg-gray-50"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 3V9M3 6H9"
                        stroke="#666"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleInputChange(
                        "quantityInStock",
                        Math.max(1, formData.quantityInStock - 1),
                      )
                    }
                    className="w-8 h-4 flex items-center justify-center hover:bg-gray-50"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 6H9"
                        stroke="#666"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quotation Type */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Quotation Type
              </label>
              <Select
                onValueChange={(value) =>
                  handleInputChange("quotationType", value)
                }
              >
                <SelectTrigger className="h-10 border-[var(--stroke)] text-[var(--black-40)]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-4">
              {/* Add Discount */}
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Add Discount
                </label>
                <Switch
                  checked={formData.addDiscount}
                  onCheckedChange={(checked) =>
                    handleInputChange("addDiscount", checked)
                  }
                />
              </div>

              {/* Add Expiry Date */}
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
            </div>
          </div>

          {/* Middle Column - Description & Rich Text */}
          <div className="space-y-5">
            {/* Short Description */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Short Description
              </label>
              <Textarea
                placeholder="Enter short description"
                value={formData.shortDescription}
                onChange={(e) =>
                  handleInputChange("shortDescription", e.target.value)
                }
                className="min-h-20 border-[var(--stroke)] text-[var(--black-40)] placeholder:text-[var(--black-20)] resize-none"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Quotation Long Description with Rich Text Editor */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Quotation Long Description
              </label>

              {/* Rich Text Toolbar */}
              <div className="border border-[var(--stroke)] rounded-lg overflow-hidden">
                <div className="flex items-center gap-1 p-2 border-b border-[var(--stroke)] bg-gray-50">
                  {/* Font Dropdowns */}
                  <Select defaultValue="roboto">
                    <SelectTrigger className="w-24 h-8 text-xs border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="arial">Arial</SelectItem>
                      <SelectItem value="helvetica">Helvetica</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="paragraph">
                    <SelectTrigger className="w-24 h-8 text-xs border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                      <SelectItem value="heading1">Heading 1</SelectItem>
                      <SelectItem value="heading2">Heading 2</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="w-px h-6 bg-[var(--stroke)] mx-1"></div>

                  {/* Format Buttons */}
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <span className="text-sm font-bold">B</span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <span className="text-sm underline">U</span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <span className="text-sm italic">I</span>
                  </button>

                  <div className="w-px h-6 bg-[var(--stroke)] mx-1"></div>

                  {/* Alignment Buttons */}
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 3H12M2 6H12M2 9H12M2 12H8"
                        stroke="#666"
                        strokeWidth="1"
                      />
                    </svg>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 3H12M2 6H8M2 9H10M2 12H6"
                        stroke="#666"
                        strokeWidth="1"
                      />
                    </svg>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 3H12M6 6H12M4 9H12M8 12H12"
                        stroke="#666"
                        strokeWidth="1"
                      />
                    </svg>
                  </button>

                  <div className="w-px h-6 bg-[var(--stroke)] mx-1"></div>

                  {/* Link Button */}
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M6 9L8 7M8 7L6 5M8 7H2M12 7C12 9.761 9.761 12 7 12S2 9.761 2 7 4.239 2 7 2 12 4.239 12 7Z"
                        stroke="#666"
                        strokeWidth="1"
                      />
                    </svg>
                  </button>
                </div>

                {/* Rich Text Area */}
                <div className="p-3 min-h-32">
                  <Textarea
                    placeholder="Your text goes here"
                    value={formData.longDescription}
                    onChange={(e) =>
                      handleInputChange("longDescription", e.target.value)
                    }
                    className="border-0 resize-none shadow-none focus:outline-none min-h-28 text-[var(--black-40)] placeholder:text-[var(--black-20)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              </div>
            </div>

            {/* Return Policy Toggle */}
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Add Return Policy
              </label>
              <Switch
                checked={formData.addReturnPolicy}
                onCheckedChange={(checked) =>
                  handleInputChange("addReturnPolicy", checked)
                }
              />
            </div>

            {/* Date Added Section */}
            <div className="space-y-3">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Date Added
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span
                    className="text-xs text-[var(--black-30)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Date
                  </span>
                  <Input
                    type="date"
                    value="2020-12-12"
                    onChange={(e) =>
                      handleInputChange("dateAdded", e.target.value)
                    }
                    className="h-10 border-[var(--stroke)] text-[var(--black-40)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                <div className="space-y-1">
                  <span
                    className="text-xs text-[var(--black-30)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Time
                  </span>
                  <Input
                    type="time"
                    value="12:00"
                    onChange={(e) =>
                      handleInputChange("timeAdded", e.target.value)
                    }
                    className="h-10 border-[var(--stroke)] text-[var(--black-40)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Image Upload */}
          <div className="space-y-5">
            {/* Main Image Upload */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Upload Image
              </label>
              <div className="border-2 border-dashed border-[var(--stroke)] rounded-lg p-8 text-center bg-[var(--main-background)]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-[var(--stroke)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                        stroke="#5570F1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 10L12 15L17 10"
                        stroke="#5570F1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 15V3"
                        stroke="#5570F1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="text-sm font-medium text-[var(--primary-100)] mb-1"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Upload Image
                    </div>
                    <div
                      className="text-xs text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Upload a cover image for your Quotation
                    </div>
                    <div
                      className="text-xs text-[var(--black-20)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      jpeg, png Recommended Size 600x600 (1:1)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Images */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-[var(--black-100)]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Additional Images
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-dashed border-[var(--stroke)] rounded-lg p-4 aspect-square flex items-center justify-center bg-[var(--main-background)]">
                  <div className="text-center">
                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-[var(--stroke)] mx-auto mb-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 3V13M3 8H13"
                          stroke="#5570F1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div
                      className="text-xs text-[var(--black-30)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Upload
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-[var(--stroke)] rounded-lg p-4 aspect-square flex items-center justify-center bg-[var(--main-background)]">
                  <div className="text-center">
                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-[var(--stroke)] mx-auto mb-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 3V13M3 8H13"
                          stroke="#5570F1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div
                      className="text-xs text-[var(--black-30)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Upload
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
