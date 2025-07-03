// app/consultant-dashboard/dashboard/quotations/page.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateQuotationModal } from "@/components/modals/create-quotation-modal";
import Navigator from "@/components/navigation/Navigator";
import { useQuotations, formatQuotationStatus, formatCurrency, getDaysUntilExpiry } from "@/hooks/useQuotations";

export default function QuotationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);

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
    search: searchTerm,
    status: statusFilter,
  });

  // Update filters when search or status changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value });
  };

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
    <div
      style={{ background: "var(--main-background)" }}
      className="min-h-screen"
    >
      {/* Top Navigation */}
      <div className="bg-white border-b border-[var(--stroke)]">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <h1
              className="text-xl font-medium text-[var(--black-60)]"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Quotations
            </h1>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--secondary-20)]">
                <span
                  className="text-sm text-[var(--black-100)]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {"{Consultant's Name}"}
                </span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="#1C1D22"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="relative">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="text-[var(--primary-100)]"
                >
                  <path
                    d="M16.4744 9.70477C15.8657 8.9939 15.5891 8.37787 15.5891 7.33129V6.97543C15.5891 5.61161 15.2752 4.73288 14.5927 3.85415C13.5409 2.48949 11.7702 1.66699 10.0367 1.66699H9.96298C8.26596 1.66699 6.55072 2.45172 5.48067 3.76099C4.76095 4.65734 4.41061 5.57384 4.41061 6.97543V7.33129C4.41061 8.37787 4.15221 8.9939 3.52524 9.70477C3.06393 10.2285 2.9165 10.9016 2.9165 11.6301C2.9165 12.3594 3.15586 13.0501 3.63623 13.6116C4.26319 14.2847 5.14855 14.7144 6.05296 14.7891C7.36238 14.9385 8.67179 14.9947 10.0003 14.9947C11.3279 14.9947 12.6373 14.9008 13.9475 14.7891C14.8511 14.7144 15.7365 14.2847 16.3634 13.6116C16.843 13.0501 17.0832 12.3594 17.0832 11.6301C17.0832 10.9016 16.9357 10.2285 16.4744 9.70477Z"
                    fill="#5570F1"
                  />
                  <path
                    opacity="0.4"
                    d="M11.674 16.0238C11.2574 15.9348 8.71888 15.9348 8.30229 16.0238C7.94616 16.106 7.56104 16.2974 7.56104 16.717C7.58174 17.1173 7.81613 17.4707 8.14079 17.6948L8.13996 17.6956C8.55987 18.0229 9.05266 18.2311 9.56864 18.3058C9.8436 18.3435 10.1235 18.3418 10.4084 18.3058C10.9236 18.2311 11.4164 18.0229 11.8363 17.6956L11.8355 17.6948C12.1601 17.4707 12.3945 17.1173 12.4152 16.717C12.4152 16.2974 12.0301 16.106 11.674 16.0238Z"
                    fill="#5570F1"
                  />
                </svg>
              </div>
              <img
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/b46ae8e430c0e00c43a867420ccb2a521eda6c8b?width=64"
                alt="Profile"
                className="w-8 h-8 rounded-lg"
              />
            </div>
          </div>
        </div>

      <Navigator />

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

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-base font-medium text-[var(--black-60)]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Quotations Summary
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
        <div className="grid md:grid-cols-2 gap-5 mb-6">
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
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 w-44 h-7 text-xs border-[var(--black-1)] text-[var(--black-2)] placeholder:text-[var(--black-2)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>

                {/* Filter Buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-[var(--black-50)] text-[var(--black-50)] hover:bg-gray-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 17"
                    fill="none"
                    className="mr-2"
                  >
                    <path
                      d="M14.6668 2.5H1.3335L6.66683 8.80667V13.1667L9.3335 14.5V8.80667L14.6668 2.5Z"
                      stroke="#53545C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Filter
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-[var(--black-50)] text-[var(--black-50)] hover:bg-gray-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 17"
                    fill="none"
                    className="mr-2"
                  >
                    <path
                      d="M2.06152 6.76931H13.9442"
                      stroke="#53545C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Filter
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-[var(--black-50)] text-[var(--black-50)] hover:bg-gray-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 17"
                    fill="none"
                    className="mr-2"
                  >
                    <path
                      d="M10.555 5.94976L6.73936 9.80612L2.39962 7.09178C1.77783 6.70276 1.90718 5.75829 2.61048 5.55262L12.9142 2.53518C13.5582 2.34642 14.155 2.94855 13.9637 3.59466L10.9154 13.8912C10.7066 14.5955 9.76747 14.7213 9.38214 14.0968L6.73734 9.8068"
                      stroke="#53545C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Share
                </Button>

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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-b border-[var(--grey)]">
                    <th className="text-left py-3 pl-0 pr-4">
                      <input
                        type="checkbox"
                        checked={
                          selectedQuotations.length ===
                            currentQuotations.length &&
                          currentQuotations.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-6 h-6 rounded-lg border border-[var(--black-1)]"
                      />
                    </th>
                    <th className="text-left py-3 px-4">
                      <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-2">
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
                                className={`text-sm ${
                                  quotation.isExpired
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
  );
}
