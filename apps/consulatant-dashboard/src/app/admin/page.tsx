"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  Download,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useConsultantManagement, useAdminStats } from "@/hooks/useAdminData";
import { ConsultantData } from "@/lib/adminApi";

// Using types from adminApi
type Consultant = ConsultantData;

// Status Toggle Component
const StatusToggle = ({ 
  label, 
  checked, 
  onChange, 
  disabled = false,
  variant = "default"
}: { 
  label: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  disabled?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "success": return "data-[state=checked]:bg-green-600";
      case "warning": return "data-[state=checked]:bg-yellow-600";
      case "danger": return "data-[state=checked]:bg-red-600";
      default: return "data-[state=checked]:bg-blue-600";
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={getVariantClasses()}
      />
      <label className="text-sm font-medium">{label}</label>
    </div>
  );
};

// Consultant Row Component
const ConsultantRow = ({ 
  consultant, 
  onStatusUpdate, 
  isUpdating 
}: { 
  consultant: Consultant; 
  onStatusUpdate: (id: string, field: 'isEmailVerified' | 'isApprovedByAdmin' | 'isActive', value: boolean) => void;
  isUpdating: boolean;
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Status icon helper removed as it's not being used

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Basic Info */}
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          {consultant.profilePhotoUrl ? (
            <img
              src={consultant.profilePhotoUrl}
              alt={`${consultant.firstName} ${consultant.lastName}`}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {consultant.firstName} {consultant.lastName}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {consultant.email}
            </div>
          </div>
        </div>
      </td>

      {/* Contact & Sector */}
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="text-sm flex items-center gap-1">
            <Phone className="h-3 w-3 text-gray-400" />
            {consultant.phoneCountryCode} {consultant.phoneNumber}
          </div>
          {consultant.consultancySector && (
            <div className="text-sm flex items-center gap-1">
              <Building2 className="h-3 w-3 text-gray-400" />
              {consultant.consultancySector}
            </div>
          )}
        </div>
      </td>

      {/* Stats */}
      <td className="px-4 py-4">
        <div className="space-y-1 text-sm">
          <div>Sessions: {consultant.stats?.totalSessions || 0}</div>
          <div>Clients: {consultant.stats?.totalClients || 0}</div>
          <div>Experience: {Math.floor((consultant.experienceMonths || 0) / 12)}y {(consultant.experienceMonths || 0) % 12}m</div>
        </div>
      </td>

      {/* Status Toggles */}
      <td className="px-4 py-4">
        <div className="space-y-3">
          <StatusToggle
            label="Email Verified"
            checked={consultant.isEmailVerified}
            onChange={(value) => onStatusUpdate(consultant.id, "isEmailVerified", value)}
            disabled={isUpdating}
            variant="success"
          />
          <StatusToggle
            label="Admin Approved"
            checked={consultant.isApprovedByAdmin}
            onChange={(value) => onStatusUpdate(consultant.id, "isApprovedByAdmin", value)}
            disabled={isUpdating}
            variant="warning"
          />
          <StatusToggle
            label="Active"
            checked={consultant.isActive}
            onChange={(value) => onStatusUpdate(consultant.id, "isActive", value)}
            disabled={isUpdating}
            variant="default"
          />
        </div>
      </td>

      {/* Metadata */}
      <td className="px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={consultant.profileCompleted ? "default" : "secondary"}>
              Profile: {consultant.profileCompleted ? "Complete" : "Incomplete"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{consultant.status}</Badge>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Joined: {formatDate(consultant.createdAt)}
          </div>
          {consultant.lastLoginAt && (
            <div className="text-xs text-gray-500">
              Last login: {formatDate(consultant.lastLoginAt)}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default function AdminPage() {
  const {
    consultants,
    isLoading,
    isUpdating,
    searchQuery,
    statusFilter,
    handleSearch,
    handleFilter,
    updateConsultantStatus,
    refresh
  } = useConsultantManagement();
  
  const stats = useAdminStats(consultants);

  // Data is now loaded through useConsultantManagement hook

  // Filtering is now handled in the hook

  // Status updates are now handled by the updateConsultantStatus function from the hook

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Export functionality to be implemented');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage consultant accounts and permissions</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => refresh()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consultants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConsultants}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approvedConsultants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeConsultants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Emails</CardTitle>
              <Mail className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.verifiedEmails}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search consultants by name, email, or sector..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Approval</option>
                  <option value="verified">Email Verified</option>
                  <option value="unverified">Email Unverified</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consultants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Consultants ({consultants.length})</span>
              {isUpdating && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consultant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact & Sector
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Controls
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consultants.map((consultant) => (
                    <ConsultantRow
                      key={consultant.id}
                      consultant={consultant}
                      onStatusUpdate={updateConsultantStatus}
                      isUpdating={isUpdating}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            {consultants.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No consultants found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}