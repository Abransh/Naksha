// apps/consultant-dashboard/src/app/dashboard/sessions/page.tsx

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateSessionModal } from "@/components/modals/create-session-modal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Navigator from "@/components/navigation/Navigator";
import { useSessions, Session } from "@/hooks/useSessions";
import { useAuth } from "@/app/providers";
import { useConsultantProfile } from "@/hooks/useConsultantProfile";
import { toast } from "sonner";

import {
  BarChart3,
  ShoppingBag,
  Users,
  ChevronDown,
  Home,

  Plus,
  Search,
  Copy,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  MoreHorizontal,
} from "lucide-react";

// Dynamic Status Badge component
const StatusBadge = ({ 
  status, 
  onStatusChange, 
  sessionId, 
  disabled = false 
}: { 
  status: Session['status']; 
  onStatusChange?: (sessionId: string, newStatus: Session['status']) => Promise<void>;
  sessionId: string;
  disabled?: boolean;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: Session['status']) => {
    if (!onStatusChange || disabled || isUpdating) return;
    
    try {
      setIsUpdating(true);
      await onStatusChange(sessionId, newStatus);
      toast.success(`Session marked as ${newStatus.toLowerCase()}`);
    } catch (error) {
      toast.error('Failed to update session status');
      console.error('Status update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusStyle = (status: Session['status']) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 text-green-600 border-green-200";
      case "CONFIRMED":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "PENDING":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "CANCELLED":
        return "bg-red-50 text-red-600 border-red-200";
      case "ABANDONED":
        return "bg-gray-50 text-gray-600 border-gray-200";
      case "NO_SHOW":
        return "bg-purple-50 text-purple-600 border-purple-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusLabel = (status: Session['status']) => {
    switch (status) {
      case "COMPLETED": return "Completed";
      case "CONFIRMED": return "Confirmed";
      case "PENDING": return "Pending";
      case "CANCELLED": return "Cancelled";
      case "ABANDONED": return "Abandoned";
      case "NO_SHOW": return "No Show";
      default: return status;
    }
  };

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle size={14} />;
      case "CONFIRMED": return <Clock size={14} />;
      case "PENDING": return <AlertCircle size={14} />;
      case "CANCELLED": return <XCircle size={14} />;
      default: return null;
    }
  };

  if (onStatusChange && !disabled) {
    return (
      <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className={`w-auto h-auto px-3 py-1 text-xs font-medium rounded-lg border ${getStatusStyle(status)}`}>
          <div className="flex items-center gap-1">
            {isUpdating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              getStatusIcon(status)
            )}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
          <SelectItem value="NO_SHOW">No Show</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border ${getStatusStyle(status)}`}>
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </div>
  );
};

// Payment Status Badge component
const PaymentStatusBadge = ({ 
  status, 
  onStatusChange, 
  sessionId, 
  disabled = false 
}: { 
  status: Session['paymentStatus']; 
  onStatusChange?: (sessionId: string, newStatus: Session['paymentStatus']) => Promise<void>;
  sessionId: string;
  disabled?: boolean;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: Session['paymentStatus']) => {
    if (!onStatusChange || disabled || isUpdating) return;
    
    try {
      setIsUpdating(true);
      await onStatusChange(sessionId, newStatus);
      toast.success(`Payment marked as ${newStatus.toLowerCase()}`);
    } catch (error) {
      toast.error('Failed to update payment status');
      console.error('Payment status update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusStyle = (status: Session['paymentStatus']) => {
    switch (status) {
      case "PAID":
        return "bg-green-50 text-green-600 border-green-200";
      case "PENDING":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "FAILED":
        return "bg-red-50 text-red-600 border-red-200";
      case "REFUNDED":
        return "bg-gray-50 text-gray-600 border-gray-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusLabel = (status: Session['paymentStatus']) => {
    switch (status) {
      case "PAID": return "Paid";
      case "PENDING": return "Pending";
      case "FAILED": return "Failed";
      case "REFUNDED": return "Refunded";
      default: return status;
    }
  };

  if (onStatusChange && !disabled) {
    return (
      <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className={`w-auto h-auto px-3 py-1 text-xs font-medium rounded-lg border ${getStatusStyle(status)}`}>
          <div className="flex items-center gap-1">
            {isUpdating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="PAID">Paid</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
          <SelectItem value="REFUNDED">Refunded</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border ${getStatusStyle(status)}`}>
      {getStatusLabel(status)}
    </div>
  );
};

// Action Button Component
const ActionButton = ({ 
  session, 
  onUpdate 
}: { 
  session: Session; 
  onUpdate: (sessionId: string, updates: any) => Promise<void>;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkCompleted = () => {
    onUpdate(session.id, { status: 'COMPLETED' });
    setIsOpen(false);
  };

  const handleMarkPaid = () => {
    onUpdate(session.id, { paymentStatus: 'PAID' });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
      >
        <MoreHorizontal size={14} />
      </Button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-white border rounded-lg shadow-lg py-1">
            <button
              onClick={handleMarkCompleted}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <CheckCircle size={14} />
              Mark as Completed
            </button>
            <button
              onClick={handleMarkPaid}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <CheckCircle size={14} />
              Mark as Paid
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default function SessionsPage() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useConsultantProfile({ enabled: true });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Use the sessions hook with auto-refresh
  const {
    sessions,
    summary,
    pagination,
    filters,
    isLoading,
    isRefreshing,
    error,
    updateSession,
    bulkUpdateSessions,
    changePage,
    changePageSize,
    updateFilters,
    clearFilters,
    refresh,
    formatCurrency,
    formatDate,
  } = useSessions();

  // Handle session status updates
  const handleStatusUpdate = useCallback(async (sessionId: string, newStatus: Session['status']) => {
    try {
      await updateSession(sessionId, { status: newStatus });
    } catch (error) {
      throw error; // Re-throw to be handled by StatusBadge
    }
  }, [updateSession]);

  // Handle payment status updates
  const handlePaymentStatusUpdate = useCallback(async (sessionId: string, newStatus: Session['paymentStatus']) => {
    try {
      await updateSession(sessionId, { paymentStatus: newStatus });
    } catch (error) {
      throw error; // Re-throw to be handled by PaymentStatusBadge
    }
  }, [updateSession]);

  // Handle session updates
  const handleSessionUpdate = useCallback(async (sessionId: string, updates: any) => {
    try {
      await updateSession(sessionId, updates);
      toast.success('Session updated successfully');
    } catch (error) {
      toast.error('Failed to update session');
      console.error('Session update error:', error);
    }
  }, [updateSession]);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    updateFilters({ ...filters, search: term || undefined });
  }, [filters, updateFilters]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    updateFilters({ 
      ...filters, 
      [key]: value === 'all' ? undefined : value 
    });
  }, [filters, updateFilters]);

  // Handle session selection
  const handleSessionSelect = useCallback((sessionId: string, checked: boolean) => {
    setSelectedSessions(prev => 
      checked 
        ? [...prev, sessionId]
        : prev.filter(id => id !== sessionId)
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedSessions(checked ? sessions.map(s => s.id) : []);
  }, [sessions]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedSessions.length === 0) {
      toast.error('Please select sessions first');
      return;
    }

    try {
      let updates = {};
      switch (action) {
        case 'mark-completed':
          updates = { status: 'COMPLETED' };
          break;
        case 'mark-paid':
          updates = { paymentStatus: 'PAID' };
          break;
        default:
          return;
      }

      await bulkUpdateSessions(selectedSessions, updates);
      setSelectedSessions([]);
      toast.success(`${selectedSessions.length} sessions updated`);
    } catch (error) {
      toast.error('Failed to update sessions');
      console.error('Bulk update error:', error);
    }
  }, [selectedSessions, bulkUpdateSessions]);

  // Copy meeting link to clipboard
  const copyMeetingLink = useCallback(async (meetingLink: string) => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      toast.success('Meeting link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy meeting link');
    }
  }, []);

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

        {/* Error Toast */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 z-50 max-w-md">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-500 flex-shrink-0" />
              <span className="text-red-800 text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Sidebar */}
        <Navigator />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-[88px]">
          {/* Top Navigation */}
          <div className="bg-white">
            <div className="px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="lg:hidden">
                    <Navigator />
                  </div>
                  <h1 className="text-[var(--black-60)] font-poppins text-lg lg:text-xl font-medium">
                    Sessions
                  </h1>
                  {isRefreshing && (
                    <Loader2 size={16} className="animate-spin text-[var(--primary-100)]" />
                  )}
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
            <div className="hidden sm:block px-4 lg:px-6 py-2 border-t border-[var(--stroke)]">
              <div className="flex items-center gap-2 lg:gap-3 text-xs overflow-x-auto">
                <Home size={12} className="text-[var(--primary-100)] flex-shrink-0" />
                <span className="text-[var(--black-30)] flex-shrink-0">/</span>
                <span className="text-[var(--black-30)] flex-shrink-0">Sessions</span>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-4 lg:p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[var(--black-60)] font-inter text-base font-medium">
                Sessions Summary
              </h2>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl px-4 py-2 font-inter text-sm"
              >
                <Plus size={16} className="mr-2" />
                Add a Session
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {/* Total Sessions Card */}
              <Card className="bg-white border-0 shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                      <ShoppingBag size={20} className="text-[var(--black-100)]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--black-10)] text-xs">All Time</span>
                      <ChevronDown size={12} className="text-[var(--black-10)]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Total Sessions</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {summary.totalSessions}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Pending</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {summary.pendingSessions}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Completed</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {summary.completedSessions}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Statistics Card */}
              <Card className="bg-white border-0 shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-[var(--black-100)]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--black-10)] text-xs">All Time</span>
                      <ChevronDown size={12} className="text-[var(--black-10)]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Cancelled</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {summary.cancelledSessions}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Repeat Clients</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {summary.repeatClients}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[var(--action-red)] text-sm">Client No Show</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {summary.clientsDidntJoin}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Card */}
              <Card className="bg-white border-0 shadow-sm rounded-xl md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                      <BarChart3 size={20} className="text-[var(--primary-100)]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--black-10)] text-xs">All Time</span>
                      <ChevronDown size={12} className="text-[var(--black-10)]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Total Revenue</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {formatCurrency(summary.totalRevenue)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[var(--black-30)] text-sm">Pending Revenue</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                          {formatCurrency(summary.pendingRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sessions Table */}
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-[var(--black-60)] font-inter text-base font-medium">
                    Client Sessions
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                      />
                    </div>
                    
                    {/* Filter Buttons */}
                    <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.sessionType || 'all'} onValueChange={(value) => handleFilterChange('sessionType', value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="PERSONAL">Personal</SelectItem>
                        <SelectItem value="WEBINAR">Webinar</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>

                    {/* Bulk Actions */}
                    {selectedSessions.length > 0 && (
                      <Select onValueChange={handleBulkAction}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={`Bulk Action (${selectedSessions.length})`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mark-completed">Mark as Completed</SelectItem>
                          <SelectItem value="mark-paid">Mark as Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="border-t border-b border-gray-200 px-6 py-4">
                  <div className="grid grid-cols-8 gap-4 items-center text-sm font-medium text-[var(--black-90)]">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedSessions.length === sessions.length && sessions.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                      <span>Client Name</span>
                    </div>
                    <div>Session Date</div>
                    <div>Session Type</div>
                    <div>Meeting Link</div>
                    <div>Amount</div>
                    <div>Payment</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-gray-100">
                  {sessions.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <ShoppingBag size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-[var(--black-60)] font-medium mb-2">No sessions found</h3>
                      <p className="text-[var(--black-30)] text-sm mb-4">
                        {Object.keys(filters).some(key => filters[key as keyof typeof filters])
                          ? 'Try adjusting your filters or search term'
                          : 'Create your first session to get started'
                        }
                      </p>
                      {!Object.keys(filters).some(key => filters[key as keyof typeof filters]) && (
                        <Button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white"
                        >
                          <Plus size={16} className="mr-2" />
                          Add a Session
                        </Button>
                      )}
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="px-6 py-4">
                        <div className="grid grid-cols-8 gap-4 items-center text-sm">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selectedSessions.includes(session.id)}
                              onChange={(e) => handleSessionSelect(session.id, e.target.checked)}
                            />
                            <div>
                              <span className="text-[var(--black-40)] font-medium">
                                {session.client.name}
                              </span>
                              <div className="text-xs text-[var(--black-30)]">
                                {session.client.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-[var(--black-40)]">
                            {formatDate(session.scheduledDate)}
                            <div className="text-xs text-[var(--black-30)]">
                              {session.scheduledTime}
                            </div>
                          </div>
                          <div className="text-[var(--black-40)]">
                            {session.sessionType === 'PERSONAL' ? 'Consultation' : 'Webinar'}
                          </div>
                          <div className="flex items-center gap-2">
                            {session.meetingLink ? (
                              <>
                                <span className="text-[var(--black-40)] truncate max-w-24">
                                  {session.platform} Link
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyMeetingLink(session.meetingLink!)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy size={12} className="text-gray-400 hover:text-gray-600" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-[var(--black-30)]">Generating...</span>
                            )}
                          </div>
                          <div className="text-[var(--black-40)]">
                            {formatCurrency(session.amount)}
                          </div>
                          <div>
                            <PaymentStatusBadge
                              status={session.paymentStatus}
                              sessionId={session.id}
                              onStatusChange={handlePaymentStatusUpdate}
                            />
                          </div>
                          <div>
                            <StatusBadge
                              status={session.status}
                              sessionId={session.id}
                              onStatusChange={handleStatusUpdate}
                            />
                          </div>
                          <div>
                            <ActionButton
                              session={session}
                              onUpdate={handleSessionUpdate}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {sessions.length > 0 && (
                  <div className="border-t border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Select value={pagination.limit.toString()} onValueChange={(value) => changePageSize(Number(value))}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-gray-500">Items per page</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} items
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Select value={pagination.page.toString()} onValueChange={(value) => changePage(Number(value))}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: pagination.totalPages }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-gray-600">of {pagination.totalPages} pages</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => changePage(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage}
                          >
                            <ArrowLeft size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => changePage(pagination.page + 1)}
                            disabled={!pagination.hasNextPage}
                          >
                            <ArrowRight size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Session Modal */}
        <CreateSessionModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      </div>
    </ProtectedRoute>
  );
}