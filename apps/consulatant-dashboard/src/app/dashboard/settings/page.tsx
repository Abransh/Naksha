// apps/consulatant-dashboard/src/app/dashboard/settings/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


import {

  ChevronDown,

  Home,


  User,
  Mail,
  MapPin,
  Upload,
  Trash2,
  Loader2,

  CheckCircle,
} from "lucide-react";
import { useSettingsForm, useProfileCompletion } from "@/hooks/useConsultantProfile";
import { toast } from "react-hot-toast";
import Navigator from "@/components/navigation/Navigator";
import { TeamsIntegration } from "@/components/settings/TeamsIntegration";
import { AvailabilityModal } from "@/components/modals/availability-modal";

// Removed SidebarContent - now using Navigator component

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("account");
  // const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

  const {
    profile,
    formData,
    hasChanges,
    isLoading,
    isSaving,
    error,
    updateFormData,
    handleSubmit,

    uploadPhoto,
    clearError,
  } = useSettingsForm();

  const {

    completionPercentage,
    isComplete,
  } = useProfileCompletion();

  // Show error as toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    updateFormData(field, value);
  };

  const handleSaveProfile = async () => {
    const success = await handleSubmit();
    if (success) {
      toast.success("Profile updated successfully!");
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const photoUrl = await uploadPhoto(file);
      if (photoUrl) {
        toast.success("Profile photo updated successfully!");
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoDelete = () => {
    // Handle photo deletion logic
    toast.success("Profile photo removed");
  };

  const handlePreviewPage = () => {
    if (profile?.slug) {
      // Open the consultant's public profile page in a new tab
      const profileUrl = `/${profile.slug}`;
      window.open(profileUrl, '_blank');
    } else {
      toast.error("Please save your profile first to generate a preview page");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--main-background)] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary-100)]" />
          <span className="text-[var(--black-60)]">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--main-background)] flex">
      {/* Navigation Sidebar */}
      <Navigator />

      {/* Main Content */}
      <div className="flex-1 lg:ml-[88px]">
        {/* Top Navigation */}
        <div className="bg-white border-b border-[var(--stroke)]">
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile menu handled by Navigator */}
                <div className="lg:hidden">
                  <Navigator />
                </div>
                <h1 className="text-xl font-medium text-[var(--black-60)] font-poppins">
                  Settings
                </h1>
              </div>
              <div className="flex items-center gap-5">
                <div className="bg-[var(--secondary-20)] rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <span className="text-sm text-[var(--black-100)] font-inter">
                    {profile ? `${profile.firstName} ${profile.lastName}` : 'Loading...'}
                  </span>

                </div>

                {profile?.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <User size={16} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="px-5 py-1 border-t border-[var(--stroke)]">
            <div className="flex items-center gap-3 text-xs">
              <Home size={16} className="text-[var(--primary-100)]" />
              <span className="text-[var(--black-30)]">/</span>
              <span className="text-[var(--black-30)]">Settings</span>
  
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-7">
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardContent className="p-9">
              {/* Tab Navigation */}
              <div className="flex items-start w-[400px] h-[39px] mb-5">
                <button
                  onClick={() => setActiveTab("account")}
                  className={`flex-1 px-2.5 py-2.5 text-center border-b-4 ${activeTab === "account"
                      ? "border-[var(--primary-100)] text-[var(--black-5)]"
                      : "border-transparent text-[var(--black-30)]"
                    } font-inter text-base`}
                >
                  Account
                </button>
                <div className="flex-1 px-2.5 py-2.5"></div>
                <div className="flex-1 px-2.5 py-2.5"></div>
              </div>

              {/* Content Header */}
              <div className="flex items-center justify-between mb-15">
                <div>
                  <h2 className="text-xl font-medium text-[var(--black-60)] font-poppins">
                    Profile Settings
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary-100)]"></div>
                    <span className="text-sm text-[var(--black-40)]">
                      {completionPercentage}% complete
                    </span>
                    {isComplete && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={!hasChanges || isSaving}
                  className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl px-4 py-4 h-9 font-inter text-xl font-bold disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save updates"
                  )}
                </Button>
              </div>

              {/* Form Content */}
              <div className="flex items-start gap-7 mt-24">
                {/* Left Column - Personal Details */}
                <div className="flex flex-col gap-12 w-[375px]">
                  {/* Personal Information */}
                  <div className="flex flex-col gap-4">
                    {/* First Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        First Name
                      </label>
                      <div className="relative">
                        <User
                          size={20}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-4)]"
                        />
                        <Input
                          value={formData.firstName || ''}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>

                    {/* Last Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Last Name
                      </label>
                      <div className="relative">
                        <User
                          size={20}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-4)]"
                        />
                        <Input
                          value={formData.lastName || ''}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          size={20}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-4)]"
                        />
                        <Input
                          type="email"
                          value={profile?.email || ''}
                          disabled
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 text-base text-[var(--black-4)] font-inter opacity-50 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Phone Number
                      </label>
                      <div className="flex gap-1.5">
                        <div className="w-[142px] h-[52px] bg-[var(--input-defaultBackground)] rounded-lg px-4 flex items-center gap-2">
                          <img
                            src="/assets/Flag_of_India.png"
                            alt="Indian flag"
                            className="w-[35px] h-6"
                          />
                          <span className="text-base text-[var(--black-2)] font-inter">
                            {formData.phoneCountryCode || '+91'}
                          </span>

                        </div>
                        <Input
                          placeholder="Phone Number"
                          value={formData.phoneNumber || ''}
                          onChange={(e) =>
                            handleInputChange("phoneNumber", e.target.value)
                          }
                          className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>

                    {/* Consultancy Sector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Consultancy Sector
                      </label>
                      <div className="relative">
                        <MapPin
                          size={20}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-4)]"
                        />
                        <Input
                          placeholder="For e.g.: Business, Technology, Marketing"
                          value={formData.consultancySector || ''}
                          onChange={(e) =>
                            handleInputChange(
                              "consultancySector",
                              e.target.value,
                            )
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Bank Name
                      </label>
                      <Input
                        placeholder="Bank Name"
                        value={formData.bankName || ''}
                        onChange={(e) =>
                          handleInputChange("bankName", e.target.value)
                        }
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                    </div>

                    {/* Account Number & IFSC Code */}
                    <div className="flex gap-3">
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-xs text-[var(--black-4)] font-inter px-1">
                          Account Number
                        </label>
                        <Input
                          placeholder="Account Number"
                          value={formData.accountNumber || ''}
                          onChange={(e) =>
                            handleInputChange("accountNumber", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-xs text-[var(--black-4)] font-inter px-1">
                          IFSC Code
                        </label>
                        <Input
                          placeholder="IFSC Code"
                          value={formData.ifscCode || ''}
                          onChange={(e) =>
                            handleInputChange("ifscCode", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>

                    {/* GST Number */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        GST Number (Optional)
                      </label>
                      <Input
                        placeholder="Enter GST Number (15 characters)"
                        value={formData.gstNumber || ''}
                        onChange={(e) =>
                          handleInputChange("gstNumber", e.target.value.toUpperCase())
                        }
                        maxLength={15}
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                      <div className="text-xs text-gray-500 px-1">
                        Format: 22AAAAA0000A1Z5 (15 characters)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Session Details */}
                <div className="flex flex-col gap-12 w-[375px]">
                  <div className="flex flex-col gap-4">
                    {/* Personal Sessions Title */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Personal Sessions Title
                      </label>
                      <Input
                        placeholder="Title for your 1-on-1 session"
                        value={formData.personalSessionTitle || ''}
                        onChange={(e) =>
                          handleInputChange(
                            "personalSessionTitle",
                            e.target.value,
                          )
                        }
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                    </div>

                    {/* Webinar Sessions Title */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Webinar Sessions Title
                      </label>
                      <Input
                        placeholder="Title for your Webinar Session"
                        value={formData.webinarSessionTitle || ''}
                        onChange={(e) =>
                          handleInputChange(
                            "webinarSessionTitle",
                            e.target.value,
                          )
                        }
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                    </div>

                    {/* Personal Session Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Personal Session Description
                      </label>
                      <Input
                        placeholder="Describe your 1-on-1 consultation service"
                        value={formData.personalSessionDescription || ''}
                        onChange={(e) =>
                          handleInputChange("personalSessionDescription", e.target.value)
                        }
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                    </div>

                    {/* Webinar Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Webinar Description
                      </label>
                      <Input
                        placeholder="Describe your webinar sessions"
                        value={formData.webinarSessionDescription || ''}
                        onChange={(e) =>
                          handleInputChange("webinarSessionDescription", e.target.value)
                        }
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                    </div>

                    {/* General Description */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        General Bio Description
                      </label>
                      <Input
                        placeholder="General details about you in simple English"
                        value={formData.description || ''}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                      />
                    </div>

                    {/* Experience in Months */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Experience in Months
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="0"
                          type="number"
                          min="0"
                          max="600"
                          value={formData.experienceMonths || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Convert to number, default to 0 if empty or invalid
                            const numValue = value === '' ? 0 : parseInt(value, 10);
                            if (!isNaN(numValue) && numValue >= 0) {
                              handleInputChange("experienceMonths", numValue);
                            }
                          }}
                          className="w-[120px] h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base text-[var(--black-4)] font-inter"
                        />
                        <span className="text-base text-[var(--black-40)] font-inter">
                          months
                        </span>
                      </div>
                      <div className="text-xs text-[var(--black-30)] px-1">
                        {formData.experienceMonths ? 
                          `${Math.floor((formData.experienceMonths || 0) / 12)} years, ${(formData.experienceMonths || 0) % 12} months` :
                          'Enter your total experience in months'
                        }
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Price for your Personal Session
                      </label>
                      <div className="flex-col gap-1.5">
                        <Input
                          placeholder="₹200"
                          type="number"
                          value={formData.personalSessionPrice || ''}
                          onChange={(e) =>
                            handleInputChange("personalSessionPrice", Number(e.target.value))
                          }
                          className="w-[142px] h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base text-[var(--black-4)] font-inter"
                        />
                        <label className="text-xs text-[var(--black-4)] font-inter px-1">
                          Price for your Webinar
                        </label>
                        <Input
                          placeholder="₹150"
                          type="number"
                          value={formData.webinarSessionPrice || ''}
                          onChange={(e) =>
                            handleInputChange("webinarSessionPrice", Number(e.target.value))
                          }
                          className="w-[142px] h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>

                    {/* Social Links */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-[var(--black-4)] font-inter px-1">
                        Social Links
                      </label>
                      <div className="space-y-4">
                        <Input
                          placeholder="https://instagram.com/yourhandle"
                          value={formData.instagramUrl || ''}
                          onChange={(e) =>
                            handleInputChange("instagramUrl", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                        />
                        <Input
                          placeholder="https://linkedin.com/in/yourprofile"
                          value={formData.linkedinUrl || ''}
                          onChange={(e) =>
                            handleInputChange("linkedinUrl", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                        />
                        <Input
                          placeholder="https://x.com/yourhandle"
                          value={formData.xUrl || ''}
                          onChange={(e) =>
                            handleInputChange("xUrl", e.target.value)
                          }
                          className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg text-base text-[var(--black-4)] font-inter"
                        />
                      </div>
                    </div>
                  </div>


                </div>


              <div className="flex flex-row gap-8 items-start">
                {/* Far Right - Upload & Action Buttons */}
                

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsAvailabilityModalOpen(true)}
                      className="w-[172px] h-[37px] rounded-xl border border-[var(--primary-100)] text-[var(--primary-100)] text-[15px] font-inter"
                    >
                      1-on-1 Slots
                    </Button>
                

                  <Button
                    variant="outline"
                    className="w-[172px] h-[37px] rounded-xl border border-[var(--primary-100)] text-[var(--primary-100)] text-[15px] font-inter"
                  >
                    Webinar(Coming soon)
                  </Button>

                  <Button
                    onClick={handlePreviewPage}
                    className="w-[172px] h-[37px] rounded-xl bg-[var(--primary-100)] text-white text-[15px] font-inter"
                  >
                    Preview Page
                  </Button>

                  <Button 
                    onClick={() => window.open('https://drive.google.com/file/d/1ZOlQFDsLepqojwRq-hqTEiXADUYlvBCa/view?usp=sharing', '_blank')}
                    className="w-[172px] h-[37px] rounded-xl bg-[var(--primary-100)] text-white text-[15px] font-inter"
                  >
                  Privacy Policy 
                  </Button>

                  {/* Teams Integration Section */}
                  <div className="w-full mt-8">
                    <TeamsIntegration />
                  </div>
                  </div>

                  <div className="flex flex-col gap-1">
                  {/* Upload Image */}
                  <Card className="w-[172px] h-[167px] rounded-xl border border-[var(--grey)] relative overflow-hidden">
                    {profile?.profilePhotoUrl ? (
                      <img
                        src={profile.profilePhotoUrl}
                        alt="Profile"
                        className="w-[172px] h-[172px] object-cover"
                      />
                    ) : (
                      <div className="w-[172px] h-[172px] bg-gray-100 flex items-center justify-center">
                        <User size={48} className="text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                      <label className="w-8 h-8 bg-[var(--secondary-30)] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--secondary-40)] transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        {isUploading ? (
                          <Loader2 size={16} className="animate-spin text-[var(--black-100)]" />
                        ) : (
                          <Upload size={20} className="text-[var(--black-100)]" />
                        )}
                      </label>
                      {profile?.profilePhotoUrl && (
                        <button
                          onClick={handlePhotoDelete}
                          className="w-8 h-8 bg-[var(--secondary-30)] rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={20} className="text-red-600" />
                        </button>
                      )}
                    </div>
                   </Card>
                  </div>
               </div>
               
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Availability Modal */}
      <AvailabilityModal
        open={isAvailabilityModalOpen}
        onOpenChange={setIsAvailabilityModalOpen}
      />
    </div>
  );
}
