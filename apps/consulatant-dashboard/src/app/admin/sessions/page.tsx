"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Search, 
  Calendar, 
  Clock,
  Users,
  DollarSign,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Video
} from "lucide-react";
import AdminNavigation from "@/components/navigation/AdminNavigation";

// Types for session data
interface SessionData {
  id: string;
  title: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  platform: string;
  meetingLink?: string;
  notes?: string;
  consultant: {
    id: string;
    fullName: string;
    email: string;
    profilePhotoUrl?: string;
    slug: string;
  };
  client: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Mock data for now - will be replaced with API call
const mockSessions: SessionData[] = [
  {
    id: "1",
    title: "Business Strategy Consultation",
    sessionType: "PERSONAL",
    status: "COMPLETED",
    paymentStatus: "PAID",
    amount: 2500,
    currency: "INR",
    scheduledDate: "2024-01-15",
    scheduledTime: "10:00",
    durationMinutes: 60,
    platform: "Teams",
    meetingLink: "https://teams.microsoft.com/...",
    consultant: {
      id: "c1",
      fullName: "Rajesh Kumar",
      email: "rajesh@example.com",
      profilePhotoUrl: "",
      slug: "rajesh-kumar"
    },
    client: {
      id: "cl1",
      fullName: "Priya Sharma",
      email: "priya@example.com",
      phone: "+91 98765 43210"
    },
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-15T11:00:00Z"
  },
  // Add more mock sessions...
];

// Session status badge component
const SessionStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'secondary' as const, label: 'Pending' };
      case 'CONFIRMED':
        return { variant: 'default' as const, label: 'Confirmed' };
      case 'COMPLETED':
        return { variant: 'default' as const, label: 'Completed' };
      case 'CANCELLED':
        return { variant: 'destructive' as const, label: 'Cancelled' };
      case 'NO_SHOW':
        return { variant: 'destructive' as const, label: 'No Show' };
      default:
        return { variant: 'secondary' as const, label: status };
    }
  };

  const config = getStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Payment status badge component
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'secondary' as const, label: 'Pending' };
      case 'PAID':
        return { variant: 'default' as const, label: 'Paid' };
      case 'FAILED':
        return { variant: 'destructive' as const, label: 'Failed' };
      case 'REFUNDED':
        return { variant: 'outline' as const, label: 'Refunded' };
      default:
        return { variant: 'secondary' as const, label: status };
    }
  };

  const config = getStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Session details modal component
const SessionDetailsModal = ({ session }: { session: SessionData }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Session Details
        </DialogTitle>
        <DialogDescription>
          Complete information about this session
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="text-sm">{session.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-sm">{session.sessionType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Platform</label>
                <p className="text-sm">{session.platform}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Schedule</label>
              <p className="text-sm">{formatDate(session.scheduledDate)} at {session.scheduledTime}</p>
              <p className="text-xs text-gray-400">{session.durationMinutes} minutes</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <SessionStatusBadge status={session.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment</label>
                <div className="mt-1">
                  <PaymentStatusBadge status={session.paymentStatus} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="text-lg font-semibold">{formatCurrency(session.amount)}</p>
            </div>

            {session.meetingLink && (
              <div>
                <label className="text-sm font-medium text-gray-500">Meeting Link</label>
                <a 
                  href={session.meetingLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {session.meetingLink}
                </a>
              </div>
            )}

            {session.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-sm text-gray-700">{session.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultant & Client Information */}
        <div className="space-y-6">
          {/* Consultant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consultant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={session.consultant.profilePhotoUrl} alt={session.consultant.fullName} />
                  <AvatarFallback>{session.consultant.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{session.consultant.fullName}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {session.consultant.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-sm">{session.client.fullName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {session.client.email}
                </p>
              </div>
              {session.client.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {session.client.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Session Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span>{new Date(session.createdAt).toLocaleDateString('en-IN', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated:</span>
              <span>{new Date(session.updatedAt).toLocaleDateString('en-IN', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </DialogContent>
  );
};

// Main Sessions page component
export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>(mockSessions);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [consultantFilter, setConsultantFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter sessions based on search and filters
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchQuery === "" || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.consultant.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.client.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || session.paymentStatus === paymentFilter;
    const matchesConsultant = consultantFilter === "all" || session.consultant.id === consultantFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesConsultant;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    // TODO: Implement API call to refresh sessions
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleExport = useCallback(() => {
    // TODO: Implement CSV export functionality
    console.log('Export sessions functionality to be implemented');
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sessions Overview</h1>
          <p className="text-gray-600">View and manage all sessions across consultants</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'COMPLETED').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {sessions.filter(s => s.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(sessions.filter(s => s.paymentStatus === 'PAID')
                  .reduce((sum, s) => sum + s.amount, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search sessions, consultants, or clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NO_SHOW">No Show</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Payments</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>

                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sessions ({filteredSessions.length})</span>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consultant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{session.title}</div>
                          <div className="text-sm text-gray-500">{session.sessionType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={session.consultant.profilePhotoUrl} alt={session.consultant.fullName} />
                            <AvatarFallback>{session.consultant.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{session.consultant.fullName}</div>
                            <div className="text-sm text-gray-500">{session.consultant.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{session.client.fullName}</div>
                          <div className="text-sm text-gray-500">{session.client.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium">{formatDate(session.scheduledDate)}</div>
                          <div className="text-sm text-gray-500">{session.scheduledTime} ({session.durationMinutes}m)</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <SessionStatusBadge status={session.status} />
                          <PaymentStatusBadge status={session.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{formatCurrency(session.amount)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <SessionDetailsModal session={session} />
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {filteredSessions.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No sessions found matching your criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSessions.length)} of {filteredSessions.length} sessions
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}