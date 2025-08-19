"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useConsultantManagement, useAdminStats } from "@/hooks/useAdminData";
import { ConsultantData } from "@/lib/adminApi";
import AdminNavigation from "@/components/navigation/AdminNavigation";
import EditableConsultantRow from "@/components/admin/EditableConsultantRow";
import BulkOperations from "@/components/admin/BulkOperations";

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
  
  // Selection state for bulk operations
  const [selectedConsultantIds, setSelectedConsultantIds] = React.useState<string[]>([]);

  // Mock admin user data (in real app, this would come from authentication context)
  const adminUser = {
    id: 'admin-1',
    email: 'admin@nakksha.in',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  };

  // Enhanced data update function that handles both status and data updates
  const handleDataUpdate = async (id: string, updates: Partial<ConsultantData>) => {
    // TODO: Implement API call to update consultant data
    console.log('Updating consultant data:', id, updates);
    // This would call the admin API endpoint to update consultant information
    // await adminApi.updateConsultant(id, updates);
    // Then refresh the data
    refresh();
  };

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Export functionality to be implemented');
  };

  // Bulk operations handlers
  const handleSelectionChange = (ids: string[]) => {
    setSelectedConsultantIds(ids);
  };

  const handleIndividualSelection = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedConsultantIds(prev => [...prev, id]);
    } else {
      setSelectedConsultantIds(prev => prev.filter(consultantId => consultantId !== id));
    }
  };

  const handleBulkAction = async (action: string, consultantIds: string[]) => {
    console.log(`Executing bulk action: ${action} on consultants:`, consultantIds);
    
    // TODO: Implement actual bulk operations
    switch (action) {
      case 'approve_all':
        // Call API to approve all selected consultants
        // await adminApi.bulkApproveConsultants(consultantIds);
        break;
      case 'reject_all':
        // Call API to reject all selected consultants
        // await adminApi.bulkRejectConsultants(consultantIds);
        break;
      case 'verify_emails':
        // Call API to verify emails of selected consultants
        // await adminApi.bulkVerifyEmails(consultantIds);
        break;
      case 'export_selected':
        // Export selected consultants data
        // await adminApi.exportConsultants(consultantIds);
        break;
      case 'deactivate_all':
        // Call API to deactivate selected consultants
        // await adminApi.bulkDeactivateConsultants(consultantIds);
        break;
      default:
        console.warn(`Unknown bulk action: ${action}`);
    }
    
    // Refresh data after action
    refresh();
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
      <AdminNavigation 
        adminUser={adminUser} 
        pendingApprovalsCount={stats.pendingApproval}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Consultant Management</h1>
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

        {/* Stats Cards */}
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
          
          {/* Bulk Operations */}
          <BulkOperations
            consultants={consultants}
            selectedIds={selectedConsultantIds}
            onSelectionChange={handleSelectionChange}
            onBulkAction={handleBulkAction}
            isLoading={isUpdating}
          />
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
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
                      Pricing
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Controls
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metadata & Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consultants.map((consultant) => (
                    <EditableConsultantRow
                      key={consultant.id}
                      consultant={consultant}
                      onStatusUpdate={updateConsultantStatus}
                      onDataUpdate={handleDataUpdate}
                      isUpdating={isUpdating}
                      isSelected={selectedConsultantIds.includes(consultant.id)}
                      onSelectionChange={handleIndividualSelection}
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