// apps/consultant/src/app/dashboard/clients/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddClientModal } from "@/components/modals/add-client-modal";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/app/providers";
import { useDebouncedSearch } from "@/hooks/useDebounce";
import {
  AlertCircle,
  Loader2
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Navigator from "@/components/navigation/Navigator";

// Now using dynamic data from useClients hook

export default function ClientsPage() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const itemsPerPage = 10;

  // Use debounced search to prevent API calls on every keystroke
  const { searchTerm, debouncedSearchTerm, isSearching, setSearchTerm } = useDebouncedSearch();

  const {
    clients,
    summaryStats,
    pagination,
    isLoading,
    error,
    refetch,
    formatCurrency,
    formatDate
  } = useClients({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const handleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map((client) => client.id));
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId],
    );
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedClients([]); // Clear selections when changing pages
  };

  // Reset to first page when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
      setSelectedClients([]);
    }
  }, [debouncedSearchTerm, searchTerm]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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

        <Navigator />

        <div className="flex-1 flex flex-col min-w-0 lg:ml-[88px]">
          {/* Top Navigation */}
          <div className="bg-white border-b border-[var(--stroke)]">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <h1
                  className="text-xl font-medium text-[var(--black-60)]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Clients
                </h1>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--secondary-20)]">
                    <span
                      className="text-sm text-[var(--black-100)]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Consultant' : "Consultant"}
                    </span>
                    
                  </div>
                 
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/b46ae8e430c0e00c43a867420ccb2a521eda6c8b?width=64"
                    alt="Profile"
                    className="w-8 h-8 rounded-lg"
                  />
                </div>
              </div>
            </div>



            {/* Breadcrumbs */}
            <div className="px-6 py-2 border-t border-[var(--stroke)] bg-white">
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6.09566 13.8549V11.8103C6.09565 11.2922 6.51695 10.8713 7.03879 10.868H8.95491C9.47909 10.868 9.90402 11.2899 9.90402 11.8103V13.849C9.904 14.2983 10.2692 14.6636 10.7218 14.6668H12.0291C12.6396 14.6684 13.2257 14.4287 13.6579 14.0006C14.0902 13.5726 14.3332 12.9913 14.3332 12.3852V6.57739C14.3332 6.08775 14.1145 5.6233 13.7362 5.30916L9.29516 1.78301C8.51885 1.16624 7.41009 1.18617 6.65676 1.83042L2.31118 5.30916C1.915 5.61404 1.67821 6.07987 1.6665 6.57739V12.3793C1.6665 13.6426 2.69809 14.6668 3.97062 14.6668H5.24803C5.46595 14.6684 5.6755 14.5835 5.83015 14.4311C5.98481 14.2787 6.07179 14.0713 6.07178 13.8549H6.09566Z"
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
                  Clients
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
                Clients Summary
              </h2>
              <AddClientModal onClientAdded={refetch}>
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
                  Add a New Client
                </Button>
              </AddClientModal>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {/* All Clients Card */}
              <div className="bg-white rounded-xl p-4 border border-[var(--stroke)]">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,204,145,0.16)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.99268 12.6724C11.0668 12.6724 13.6943 13.1382 13.6943 14.999C13.6943 16.8599 11.0843 17.339 7.99268 17.339C4.91768 17.339 2.29102 16.8774 2.29102 15.0157C2.29102 13.154 4.90018 12.6724 7.99268 12.6724Z"
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
                        d="M13.7358 9.0679C15.07 8.8804 16.0975 7.7354 16.1 6.34956C16.1 4.98373 15.1042 3.8504 13.7983 3.63623"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15.4961 12.2769C16.7886 12.4694 17.6911 12.9227 17.6911 13.856C17.6911 14.4985 17.2661 14.9152 16.5794 15.176"
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
                      {"{Timeline}"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="#BEC0CA"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      All Clients
                    </div>
                    <div
                      className="text-xl font-medium text-[var(--black-60)]"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {isLoading ? '...' : summaryStats.totalClients}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Session Completed
                    </div>
                    <div
                      className="text-xl font-medium text-[var(--black-60)]"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {isLoading ? '...' : summaryStats.activeClients}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Pending
                    </div>
                    <div
                      className="text-xl font-medium text-[var(--black-60)]"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {isLoading ? '...' : summaryStats.clientsWithActiveSessions}
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue & Stats Card */}
              <div className="bg-white rounded-xl p-4 border border-[var(--stroke)]">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,204,145,0.16)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M13.7615 17.9166H6.80495C4.24965 17.9166 2.28931 16.9936 2.84614 13.2789L3.4945 8.24457C3.83775 6.39102 5.02005 5.68164 6.05743 5.68164H14.5395C15.5921 5.68164 16.7058 6.44442 17.1024 8.24457L17.7508 13.2789C18.2237 16.5741 16.3168 17.9166 13.7615 17.9166Z"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.876 5.49877C13.876 3.51038 12.2641 1.89847 10.2757 1.89847V1.89847C9.31822 1.89441 8.39854 2.27194 7.72005 2.94757C7.04156 3.62319 6.66015 4.54127 6.66016 5.49877H6.66016"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12.7471 9.25151H12.709"
                        stroke="#130F26"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.88825 9.25151H7.85011"
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
                      {"{Timeline}"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="#BEC0CA"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Active Clients
                    </div>
                    <div
                      className="text-xl font-medium text-[var(--black-60)]"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {isLoading ? '...' : summaryStats.activeClients}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Total Revenue
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xl font-medium text-[var(--black-60)]"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {isLoading ? '...' : formatCurrency(summaryStats.totalRevenue)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-sm text-[var(--black-30)] mb-2"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Average Revenue
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="text-xl font-medium text-[var(--black-60)]"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {isLoading ? '...' : formatCurrency(summaryStats.averageRevenuePerClient)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-xl border border-[var(--stroke)]">
              <div className="p-6">
                {/* Table Header */}
                <div className="flex items-center justify-between mb-5">
                  <h3
                    className="text-base font-medium text-[var(--black-60)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Clients
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg width="20" height="20" viewBox="0 0 20 21" fill="none">
                          <circle
                            cx="9.80541"
                            cy="10.3054"
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
                        placeholder="Search"
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-t border-b border-[var(--grey)]">
                        <th className="text-left py-3 pl-0 pr-4">
                          <input
                            type="checkbox"
                            checked={
                              selectedClients.length === clients.length &&
                              clients.length > 0
                            }
                            onChange={handleSelectAll}
                            className="w-6 h-6 rounded-lg border border-[var(--black-1)]"
                          />
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Client Name
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Email
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Phone
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Sessions
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Session Charges
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Client Since
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm text-black text-[var(--black-90)]"
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
                                d="M14 5.1665H2C1.72667 5.1665 1.5 4.93984 1.5 4.6665C1.5 4.39317 1.72667 4.1665 2 4.1665H14C14.2733 4.1665 14.5 4.39317 14.5 4.6665C14.5 4.93984 14.2733 5.1665 14 5.1665Z"
                                fill="#00092E"
                              />
                              <path
                                d="M12 8.5H4C3.72667 8.5 3.5 8.27333 3.5 8C3.5 7.72667 3.72667 7.5 4 7.5H12C12.2733 7.5 12.5 7.72667 12.5 8C12.5 8.27333 12.2733 8.5 12 8.5Z"
                                fill="#00092E"
                              />
                              <path
                                d="M9.33317 11.8335H6.6665C6.39317 11.8335 6.1665 11.6068 6.1665 11.3335C6.1665 11.0602 6.39317 10.8335 6.6665 10.8335H9.33317C9.6065 10.8335 9.83317 11.0602 9.83317 11.3335C9.83317 11.6068 9.6065 11.8335 9.33317 11.8335Z"
                                fill="#00092E"
                              />
                            </svg>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index} className="border-b border-[var(--grey)] animate-pulse">
                            <td className="py-3 pl-0 pr-4">
                              <div className="w-6 h-6 bg-gray-200 rounded"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded w-40"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded w-28"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded w-20"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-6 bg-gray-200 rounded w-16"></div>
                            </td>
                          </tr>
                        ))
                      ) : error ? (
                        // Error state
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <AlertCircle className="h-12 w-12 text-red-500" />
                              <div className="text-red-800 font-medium">Error loading clients</div>
                              <div className="text-red-600 text-sm">{error}</div>
                              <Button
                                onClick={refetch}
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Try Again
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : clients.length === 0 ? (
                        // Empty state
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M12 16C15.866 16 19 13.31 19 9.5C19 5.69 15.866 3 12 3C8.134 3 5 5.69 5 9.5C5 13.31 8.134 16 12 16Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <div className="text-gray-800 font-medium">No clients found</div>
                              <div className="text-gray-600 text-sm">
                                {searchTerm ? 'Try adjusting your search terms' : 'Add your first client to get started'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        clients.map((client) => (
                          <tr
                            key={client.id}
                            className="border-b border-[var(--grey)] last:border-b-0"
                          >
                            <td className="py-3 pl-0 pr-4">
                              <input
                                type="checkbox"
                                checked={selectedClients.includes(client.id)}
                                onChange={() => handleSelectClient(client.id)}
                                className="w-6 h-6 rounded-lg border border-[var(--black-1)]"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className="text-sm text-[var(--black-40)]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                              >
                                {client.name}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm text-[var(--black-40)]"
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  {client.email}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(client.email)}
                                  className="text-[var(--black-30)] hover:text-[var(--black-40)]"
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                  >
                                    <path
                                      d="M10.6667 13.3335H5.33333C4.8029 13.3335 4.29419 13.1228 3.91912 12.7477C3.54405 12.3726 3.33333 11.8639 3.33333 11.3335V4.66683C3.33333 4.49002 3.2631 4.32045 3.13807 4.19542C3.01305 4.0704 2.84348 4.00016 2.66667 4.00016C2.48986 4.00016 2.32029 4.0704 2.19526 4.19542C2.07024 4.32045 2 4.49002 2 4.66683V11.3335C2 12.2176 2.35119 13.0654 2.97631 13.6905C3.60143 14.3156 4.44928 14.6668 5.33333 14.6668H10.6667C10.8435 14.6668 11.013 14.5966 11.1381 14.4716C11.2631 14.3465 11.3333 14.177 11.3333 14.0002C11.3333 13.8234 11.2631 13.6538 11.1381 13.5288C11.013 13.4037 10.8435 13.3335 10.6667 13.3335ZM14 5.96016C13.9931 5.89892 13.9796 5.83858 13.96 5.78016V5.72016C13.9279 5.65162 13.8852 5.58861 13.8333 5.5335L9.83333 1.5335C9.77822 1.48164 9.71521 1.43888 9.64667 1.40683H9.58667L9.37333 1.3335H6.66667C6.13623 1.3335 5.62753 1.54421 5.25245 1.91928C4.87738 2.29436 4.66667 2.80306 4.66667 3.3335V10.0002C4.66667 10.5306 4.87738 11.0393 5.25245 11.4144C5.62753 11.7894 6.13623 12.0002 6.66667 12.0002H12C12.5304 12.0002 13.0391 11.7894 13.4142 11.4144C13.7893 11.0393 14 10.5306 14 10.0002V6.00016C14 6.00016 14 6.00016 14 5.96016ZM10 3.60683L11.7267 5.3335H10.6667C10.4899 5.3335 10.3203 5.26326 10.1953 5.13823C10.0702 5.01321 10 4.84364 10 4.66683V3.60683ZM12.6667 10.0002C12.6667 10.177 12.5964 10.3465 12.4714 10.4716C12.3464 10.5966 12.1768 10.6668 12 10.6668H6.66667C6.48986 10.6668 6.32029 10.5966 6.19526 10.4716C6.07024 10.3465 6 10.177 6 10.0002V3.3335C6 3.15668 6.07024 2.98712 6.19526 2.86209C6.32029 2.73707 6.48986 2.66683 6.66667 2.66683H8.66667V4.66683C8.66667 5.19726 8.87738 5.70597 9.25245 6.08104C9.62753 6.45612 10.1362 6.66683 10.6667 6.66683H12.6667V10.0002Z"
                                      fill="#8B8D97"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm text-[var(--black-40)]"
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  {client.phoneNumber ? `${client.phoneCountryCode || '+91'} ${client.phoneNumber}` : 'N/A'}
                                </span>
                                {client.phoneNumber && (
                                  <button
                                    onClick={() => copyToClipboard(`${client.phoneCountryCode || '+91'} ${client.phoneNumber}`)}
                                    className="text-[var(--black-30)] hover:text-[var(--black-40)]"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                    >
                                      <path
                                        d="M10.6667 13.3335H5.33333C4.8029 13.3335 4.29419 13.1228 3.91912 12.7477C3.54405 12.3726 3.33333 11.8639 3.33333 11.3335V4.66683C3.33333 4.49002 3.2631 4.32045 3.13807 4.19542C3.01305 4.0704 2.84348 4.00016 2.66667 4.00016C2.48986 4.00016 2.32029 4.0704 2.19526 4.19542C2.07024 4.32045 2 4.49002 2 4.66683V11.3335C2 12.2176 2.35119 13.0654 2.97631 13.6905C3.60143 14.3156 4.44928 14.6668 5.33333 14.6668H10.6667C10.8435 14.6668 11.013 14.5966 11.1381 14.4716C11.2631 14.3465 11.3333 14.177 11.3333 14.0002C11.3333 13.8234 11.2631 13.6538 11.1381 13.5288C11.013 13.4037 10.8435 13.3335 10.6667 13.3335ZM14 5.96016C13.9931 5.89892 13.9796 5.83858 13.96 5.78016V5.72016C13.9279 5.65162 13.8852 5.58861 13.8333 5.5335L9.83333 1.5335C9.77822 1.48164 9.71521 1.43888 9.64667 1.40683H9.58667L9.37333 1.3335H6.66667C6.13623 1.3335 5.62753 1.54421 5.25245 1.91928C4.87738 2.29436 4.66667 2.80306 4.66667 3.3335V10.0002C4.66667 10.5306 4.87738 11.0393 5.25245 11.4144C5.62753 11.7894 6.13623 12.0002 6.66667 12.0002H12C12.5304 12.0002 13.0391 11.7894 13.4142 11.4144C13.7893 11.0393 14 10.5306 14 10.0002V6.00016C14 6.00016 14 6.00016 14 5.96016ZM10 3.60683L11.7267 5.3335H10.6667C10.4899 5.3335 10.3203 5.26326 10.1953 5.13823C10.0702 5.01321 10 4.84364 10 4.66683V3.60683ZM12.6667 10.0002C12.6667 10.177 12.5964 10.3465 12.4714 10.4716C12.3464 10.5966 12.1768 10.6668 12 10.6668H6.66667C6.48986 10.6668 6.32029 10.5966 6.19526 10.4716C6.07024 10.3465 6 10.177 6 10.0002V3.3335C6 3.15668 6.07024 2.98712 6.19526 2.86209C6.32029 2.73707 6.48986 2.66683 6.66667 2.66683H8.66667V4.66683C8.66667 5.19726 8.87738 5.70597 9.25245 6.08104C9.62753 6.45612 10.1362 6.66683 10.6667 6.66683H12.6667V10.0002Z"
                                        fill="#8B8D97"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className="text-sm text-[var(--black-40)]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                              >
                                {client.totalSessions}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className="text-sm text-[var(--black-40)]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                              >
                                {formatCurrency(client.totalAmountPaid)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className="text-sm text-[var(--black-40)]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                              >
                                {formatDate(client.createdAt)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${client.isActive
                                ? 'bg-[rgba(81,156,102,0.16)] text-[var(--action-green)]'
                                : 'bg-[rgba(156,163,175,0.16)] text-gray-600'
                                } hover:bg-[rgba(81,156,102,0.16)] border-0 text-xs font-normal px-3 py-1`}>
                                {client.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
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
                          10
                        </span>
                        <svg width="16" height="16" viewBox="0 0 16 17" fill="none">
                          <path
                            d="M4 6.5L8 10.5L12 6.5"
                            stroke="#8B8D97"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <span
                      className="text-sm text-[#666]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {pagination.totalCount > 0 ? (
                        `${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.totalCount)} of ${pagination.totalCount} items`
                      ) : (
                        '0-0 of 0 items'
                      )}
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
                        <svg width="16" height="16" viewBox="0 0 16 17" fill="none">
                          <path
                            d="M4 6.5L8 10.5L12 6.5"
                            stroke="#8B8D97"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
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
                        onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                        disabled={!pagination.hasPrevPage || isLoading}
                        className="p-1 disabled:opacity-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M10.4711 11.5289C10.7314 11.7893 10.7314 12.2114 10.4711 12.4717C10.2107 12.7321 9.78862 12.7321 9.52827 12.4717L5.52827 8.47173C5.27589 8.21934 5.26705 7.81295 5.50824 7.54984L9.17491 3.54984C9.4237 3.27843 9.84541 3.26009 10.1168 3.50889C10.3882 3.75768 10.4066 4.1794 10.1578 4.45081L6.92243 7.98027L10.4711 11.5289Z"
                            fill="#666666"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                        disabled={!pagination.hasNextPage || isLoading}
                        className="p-1 disabled:opacity-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M5.52892 4.47108C5.26857 4.21073 5.26857 3.78862 5.52892 3.52827C5.78927 3.26792 6.21138 3.26792 6.47173 3.52827L10.4717 7.52827C10.7241 7.78066 10.7329 8.18705 10.4918 8.45016L6.82509 12.4502C6.5763 12.7216 6.15459 12.7399 5.88317 12.4911C5.61176 12.2423 5.59343 11.8206 5.84222 11.5492L9.07757 8.01973L5.52892 4.47108Z"
                            fill="#666666"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}