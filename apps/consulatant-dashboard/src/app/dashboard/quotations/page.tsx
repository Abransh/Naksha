// app/consultant-dashboard/dashboard/quotations/page.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CreateQuotationModal } from "@/components/modals/create-quotation-modal";
import Navigator from "@/components/navigation/Navigator";
import { useQuotations, formatQuotationStatus, formatCurrency, getDaysUntilExpiry } from "@/hooks/useQuotations";
import { useAuth } from "@/app/providers";
import { useConsultantProfile } from "@/hooks/useConsultantProfile";
import { useDebouncedSearch } from "@/hooks/useDebounce";

import {
  Loader2,
  ChevronDown, 
 
} from 'lucide-react'

export default function QuotationsPage() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useConsultantProfile({ enabled: true });
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);

  // Use debounced search to prevent API calls on every keystroke
  const { searchTerm, debouncedSearchTerm, isSearching, setSearchTerm } = useDebouncedSearch();

  // Use quotations hook for dynamic data
  const {
    quotations,
    summaryStats,
    pagination,
    isLoading,
    error,
    filters,
    refetch,
    setFilters,
    setPage,
    deleteQuotation,
    updateQuotationStatus,
    sendQuotation,
  } = useQuotations({
    search: debouncedSearchTerm,
    status: statusFilter,
  });

  // Update filters when debounced search term changes
  useEffect(() => {
    setFilters({ ...filters, search: debouncedSearchTerm || undefined });
  }, [debouncedSearchTerm]);

  // Update filters when status changes
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters({ ...filters, status: status || undefined });
  };

  const handleSelectAll = () => {
    if (selectedQuotations.length === quotations.length) {
      setSelectedQuotations([]);
    } else {
      setSelectedQuotations(quotations.map((quotation) => quotation.id));
    }
  };

  const handleSelectQuotation = (quotationId: string) => {
    setSelectedQuotations((prev) =>
      prev.includes(quotationId)
        ? prev.filter((id) => id !== quotationId)
        : [...prev, quotationId],
    );
  };

  const handleSendQuotation = async (id: string) => {
    await sendQuotation(id);
  };

  const handleDeleteQuotation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      await deleteQuotation(id);
    }
  };

  // Show loading state
  if (isLoading && quotations.length === 0) {
    return (
      <div style={{ background: "var(--main-background)" }} className="min-h-screen">
        {/* Top Navigation */}
        <div className="bg-white border-b border-[var(--stroke)]">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-medium text-[var(--black-60)]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Quotations
              </h1>
            </div>
          </div>
          <Navigator />
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-100)] mx-auto mb-4"></div>
              <p className="text-[var(--black-40)]">Loading quotations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ background: "var(--main-background)" }} className="min-h-screen">
        {/* Top Navigation */}
        <div className="bg-white border-b border-[var(--stroke)]">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-medium text-[var(--black-60)]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Quotations
              </h1>
            </div>
          </div>
          <Navigator />
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdminApproval={true}>
      <div className="min-h-screen bg-[var(--main-background)] flex">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <Loader2 className="animate-spin h-6 w-6 text-[var(--primary-100)]" />
              <span className="text-[var(--black-60)]">Loading sessions...</span>
            </div>
          </div>
        )}

        {/* Navigation Sidebar */}
        <Navigator />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-[88px]">
          {/* TOp navigation */}
          <div className="bg-white">
            <div className="px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">

                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="lg:hidden">
                    <Navigator />
                  </div>
                  <h1 className="text-[var(--black-60)] font-poppins text-lg lg:text-xl font-medium">
                    Quotations
                  </h1>
                </div>
               

                <div className="flex items-center gap-3 lg:gap-5">
                  <div className="hidden sm:flex bg-[var(--secondary-20)] rounded-lg px-3 lg:px-4 py-2 items-center gap-2 lg:gap-3">
                    <span className="text-[var(--black-100)] font-inter text-xs lg:text-sm">
                      {user ? `${user.firstName} ${user.lastName}` : "Consultant"}
                    </span>
                   
                  </div>

                  {/* Profile Image */}
                  {profile?.profilePhotoUrl ? (
                    <div className="relative w-7 h-7 lg:w-8 lg:h-8 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={profile.profilePhotoUrl}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        fill
                        className="object-cover"
                        sizes="32px"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  
                  {/* Fallback placeholder or loading */}
                  <div 
                    className={`w-7 h-7 lg:w-8 lg:h-8 bg-gray-200 rounded-lg flex items-center justify-center ${profile?.profilePhotoUrl ? 'hidden' : ''}`}
                  >
                    {profileLoading ? (
                      <Loader2 size={12} className="animate-spin text-gray-400" />
                    ) : (
                      <span className="text-gray-500 text-xs font-medium">
                        {profile?.firstName ? profile.firstName.charAt(0).toUpperCase() : user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'C'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>



            {/* Breadcrumbs */}
            <div className="px-6 py-2 border-t border-[var(--stroke)] bg-white">
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6.09566 13.8544V11.8098C6.09565 11.2917 6.51695 10.8708 7.03879 10.8676H8.95491C9.47909 10.8676 9.90402 11.2894 9.90402 11.8098V13.8485C9.904 14.2979 10.2692 14.6631 10.7218 14.6663H12.0291C12.6396 14.6679 13.2257 14.4282 13.6579 14.0001C14.0902 13.5721 14.3332 12.9908 14.3332 12.3847V6.57691C14.3332 6.08727 14.1145 5.62282 13.7362 5.30867L9.29516 1.78252C8.51885 1.16576 7.41009 1.18568 6.65676 1.82993L2.31118 5.30867C1.915 5.61356 1.67821 6.07938 1.6665 6.57691V12.3788C1.6665 13.6421 2.69809 14.6663 3.97062 14.6663H5.24803C5.46595 14.6679 5.6755 14.5831 5.83015 14.4306C5.98481 14.2782 6.07179 14.0708 6.07178 13.8544H6.09566Z"
                    fill="#5570F1"
                  />
                </svg>
                <span
                  className="text-xs text-[var(--black-30)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  /
                </span>
                <span
                  className="text-xs text-[var(--black-30)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Quotations
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 lg:p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[var(--black-60)] font-inter text-base font-medium">
                Sessions Summary
              </h2>
              <CreateQuotationModal>
                  <Button
                    className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white font-normal px-4 py-2 h-9 rounded-xl flex items-center gap-2"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 5V19"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 12H19"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Add a Quotation
                  </Button>
                </CreateQuotationModal>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-5">
              {/* All Quotations Card */}
              <div className="bg-[var(--primary-100)] rounded-xl p-4 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.16)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M17.8492 13.11C17.8492 16.0917 16.0917 17.8492 13.11 17.8492H6.625C3.63583 17.8492 1.875 16.0917 1.875 13.11V6.61C1.875 3.6325 2.97 1.875 5.9525 1.875H7.61917C8.2175 1.87583 8.78083 2.15667 9.13917 2.63583L9.9 3.6475C10.26 4.12583 10.8233 4.4075 11.4217 4.40833H13.78C16.7692 4.40833 17.8725 5.93 17.8725 8.9725L17.8492 13.11Z"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.23438 12.0524H13.5135"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-[var(--primary-10)]">
                    {isLoading ? "..." : "This Month"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-sm text-white mb-2">All Quotations</div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xl font-medium text-white"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {summaryStats?.totalQuotations || 0}
                      </div>
                      <span className="text-xs text-[var(--primary-10)]">
                        {formatCurrency(summaryStats?.totalValue || 0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-white mb-2">Accepted</div>
                    <div className="text-xl font-medium text-white">
                      {summaryStats?.acceptedQuotations || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white rounded-xl p-4 border border-[var(--stroke)]">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,204,145,0.16)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.99268 12.6719C11.0668 12.6719 13.6943 13.1377 13.6943 14.9985C13.6943 16.8594 11.0843 17.3385 7.99268 17.3385C4.91768 17.3385 2.29102 16.8769 2.29102 15.0152C2.29102 13.1535 4.90018 12.6719 7.99268 12.6719Z"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.99289 10.0163C5.97456 10.0163 4.33789 8.38051 4.33789 6.36217C4.33789 4.34384 5.97456 2.70801 7.99289 2.70801C10.0104 2.70801 11.6471 4.34384 11.6471 6.36217C11.6546 8.37301 10.0296 10.0088 8.01872 10.0163H7.99289Z"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.7358 9.06741C15.07 8.87991 16.0975 7.73491 16.1 6.34908C16.1 4.98324 15.1042 3.84991 13.7983 3.63574"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15.4961 12.2764C16.7886 12.4689 17.6911 12.9222 17.6911 13.8555C17.6911 14.498 17.2661 14.9147 16.5794 15.1755"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs text-[var(--black-10)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Conversion: {summaryStats?.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div
                      className="text-sm text-[var(--action-red)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Rejected
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xl font-medium text-[var(--black-60)]"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {summaryStats?.rejectedQuotations || 0}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Expired
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xl font-medium text-[var(--black-60)]"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {summaryStats?.expiredQuotations || 0}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Draft
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xl font-medium text-[var(--black-60)]"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {summaryStats?.draftQuotations || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quotations Table */}
            <div className="bg-white rounded-xl border border-[var(--stroke)]">
              <div className="p-6">
                {/* Table Header */}
                <div className="flex items-center justify-between mb-5">
                  <h3
                    className="text-base font-medium text-[var(--black-60)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Quotations Items
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg width="20" height="20" viewBox="0 0 20 21" fill="none">
                          <circle
                            cx="9.80541"
                            cy="10.3059"
                            r="7.49047"
                            stroke="#130F26"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M15.0151 15.9043L17.9518 18.8334"
                            stroke="#130F26"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <Input
                        type="text"
                        placeholder="Search quotations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-10 w-44 h-7 text-xs border-[var(--black-1)] text-[var(--black-2)] placeholder:text-[var(--black-2)]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-3 w-3 animate-spin text-[var(--primary-100)]" />
                        </div>
                      )}
                    </div>

                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-[var(--black-50)] text-[var(--black-50)] hover:bg-gray-50"
                    >
                      Bulk Action
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 17"
                        fill="none"
                        className="ml-2"
                      >
                        <path
                          d="M4 6.5L8 10.5L12 6.5"
                          stroke="#53545C"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto text-black">
                  <table className="w-full">
                    <thead>
                      <tr className="border-t border-b border-[var(--grey)]">
                        <th className="text-left py-3 pl-0 pr-4">
                          <input
                            type="checkbox"
                            checked={
                              selectedQuotations.length ===
                              quotations.length &&
                              quotations.length > 0
                            }
                            onChange={handleSelectAll}
                            className="w-6 h-6 rounded-lg border border-[var(--black-1)]"
                          />
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center text-black gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Quotation Name
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center text-black gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Category
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Unit Price
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Duration
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Discount
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Total Value
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Action
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Status
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.16699H2C1.72667 5.16699 1.5 4.94033 1.5 4.66699C1.5 4.39366 1.72667 4.16699 2 4.16699H14C14.2733 4.16699 14.5 4.39366 14.5 4.66699C14.5 4.94033 14.2733 5.16699 14 5.16699Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.833H6.6665C6.39317 11.833 6.1665 11.6063 6.1665 11.333C6.1665 11.0597 6.39317 10.833 6.6665 10.833H9.33317C9.6065 10.833 9.83317 11.0597 9.83317 11.333C9.83317 11.6063 9.6065 11.833 9.33317 11.833Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center">
                            <div className="text-[var(--black-30)]">
                              {isLoading ? "Loading quotations..." : "No quotations found"}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        quotations.map((quotation) => {
                          const statusInfo = formatQuotationStatus(quotation.status);
                          const daysUntilExpiry = getDaysUntilExpiry(quotation.validUntil);

                          return (
                            <tr
                              key={quotation.id}
                              className="border-b border-[var(--grey)] last:border-b-0"
                            >
                              <td className="py-3 pl-0 pr-4">
                                <input
                                  type="checkbox"
                                  checked={selectedQuotations.includes(quotation.id)}
                                  onChange={() => handleSelectQuotation(quotation.id)}
                                  className="w-6 h-6 rounded-lg border border-[var(--black-1)]"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg border border-[var(--stroke)] bg-gray-50 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M14.8492 10.11C14.8492 13.0917 13.0917 14.8492 10.11 14.8492H3.625C0.635833 14.8492 -1.125 13.0917 -1.125 10.11V3.61C-1.125 0.6325 -0.03 -1.125 2.9525 -1.125H4.61917C5.2175 -1.12583 5.78083 -0.843333 6.13917 -0.364167L6.9 0.6475C7.26 1.12583 7.82333 1.4075 8.42167 1.40833H10.78C13.7692 1.40833 14.8725 2.93 14.8725 5.9725L14.8492 10.11Z"
                                        stroke="#666"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <div
                                      className="text-sm text-[var(--black-40)] font-medium"
                                      style={{ fontFamily: "Inter, sans-serif" }}
                                    >
                                      {quotation.quotationName}
                                    </div>
                                    <div
                                      className="text-xs text-[var(--black-20)]"
                                      style={{ fontFamily: "Inter, sans-serif" }}
                                    >
                                      #{quotation.quotationNumber}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <div
                                    className="text-sm text-[var(--black-40)]"
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                  >
                                    {quotation.clientName}
                                  </div>
                                  <div
                                    className="text-xs text-[var(--black-20)]"
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                  >
                                    {quotation.clientEmail}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className="text-sm text-[var(--black-40)] text-right"
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  {formatCurrency(quotation.baseAmount, quotation.currency)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <span
                                    className={`text-sm ${quotation.isExpired
                                      ? "text-[var(--action-red)]"
                                      : "text-[var(--black-40)]"
                                      }`}
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                  >
                                    {quotation.isExpired
                                      ? "Expired"
                                      : daysUntilExpiry !== null
                                        ? `${daysUntilExpiry} days left`
                                        : "No expiry"
                                    }
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className="text-sm text-[var(--black-40)] text-right"
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  {quotation.discountPercentage > 0
                                    ? `${quotation.discountPercentage}%`
                                    : "No discount"
                                  }
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className="text-sm text-[var(--black-40)] font-medium"
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  {formatCurrency(quotation.finalAmount, quotation.currency)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {quotation.status === 'DRAFT' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendQuotation(quotation.id)}
                                      className="h-6 px-2 text-xs bg-[var(--primary-100)] text-white hover:bg-[var(--primary-100)]/90"
                                    >
                                      Send
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteQuotation(quotation.id)}
                                    className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={`${statusInfo.color} border-0 text-xs font-normal px-3 py-1`}>
                                  {statusInfo.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalCount > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--grey)]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm text-[var(--black-20)]"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          Items per page
                        </span>
                        <div className="flex items-center gap-2 bg-[rgba(94,99,102,0.08)] rounded-lg px-3 py-1">
                          <span
                            className="text-xs text-[var(--black-30)]"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {pagination.limit}
                          </span>
                        </div>
                      </div>
                      <span
                        className="text-sm text-[#666]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {((pagination.page - 1) * pagination.limit) + 1}-
                        {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
                        {pagination.totalCount} items
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-[rgba(94,99,102,0.08)] rounded-lg px-3 py-1">
                          <span
                            className="text-xs text-[var(--black-30)]"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {pagination.page}
                          </span>
                        </div>
                        <span
                          className="text-sm text-[#666]"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          of {pagination.totalPages} pages
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(Math.max(1, pagination.page - 1))}
                          disabled={!pagination.hasPrevPage || isLoading}
                          className="p-1 disabled:opacity-50 hover:bg-gray-100 rounded"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M10.4711 11.5279C10.7314 11.7883 10.7314 12.2104 10.4711 12.4708C10.2107 12.7311 9.78862 12.7311 9.52827 12.4708L5.52827 8.47075C5.27589 8.21837 5.26705 7.81198 5.50824 7.54887L9.17491 3.54887C9.4237 3.27745 9.84541 3.25912 10.1168 3.50791C10.3882 3.75671 10.4066 4.17842 10.1578 4.44983L6.92243 7.9793L10.4711 11.5279Z"
                              fill="#666666"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
                          disabled={!pagination.hasNextPage || isLoading}
                          className="p-1 disabled:opacity-50 hover:bg-gray-100 rounded"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M5.52892 4.47206C5.26857 4.21171 5.26857 3.7896 5.52892 3.52925C5.78927 3.2689 6.21138 3.2689 6.47173 3.52925L10.4717 7.52925C10.7241 7.78163 10.7329 8.18802 10.4918 8.45113L6.82509 12.4511C6.5763 12.7225 6.15459 12.7409 5.88317 12.4921C5.61176 12.2433 5.59343 11.8216 5.84222 11.5502L9.07757 8.0207L5.52892 4.47206Z"
                              fill="#666666"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Refresh Button */}
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={refetch}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={isLoading ? "animate-spin" : ""}
                    >
                      <path
                        d="M1.33325 8.00008C1.33325 11.6821 4.31792 14.6667 7.99992 14.6667C11.6819 14.6667 14.6666 11.6821 14.6666 8.00008C14.6666 4.31808 11.6819 1.33341 7.99992 1.33341C6.87325 1.33341 5.81992 1.61208 4.89325 2.10674"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.66675 3.33341L4.89341 2.10674L6.12008 4.33341"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </ProtectedRoute >
  );
}
