// React hook for admin data management
// Handles all admin dashboard data operations with real API integration

import { useState, useEffect, useCallback } from 'react';
import { adminApi, ConsultantData, AdminDashboardStats } from '@/lib/adminApi';
import { toast } from '@/components/ui/use-toast';

// Hook for admin dashboard statistics
export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard stats';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchDashboardStats,
  };
}

// Hook for consultant management
export function useConsultantManagement() {
  const [consultants, setConsultants] = useState<ConsultantData[]>([]);
  const [filteredConsultants, setFilteredConsultants] = useState<ConsultantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  // Fetch consultants with filtering
  const fetchConsultants = useCallback(async (params?: {
    page?: number;
    status?: string;
    search?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = {
        page: params?.page || pagination.page,
        limit: pagination.limit,
        status: (params?.status || statusFilter) as 'all' | 'pending' | 'approved' | 'rejected',
        search: params?.search || searchQuery,
      };

      const response = await adminApi.getAllConsultants(queryParams);
      
      setConsultants(response.data.consultants);
      setFilteredConsultants(response.data.consultants);
      setPagination({
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load consultants';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

  // Update consultant status
  const updateConsultantStatus = useCallback(async (
    consultantId: string,
    field: 'isEmailVerified' | 'isApprovedByAdmin' | 'isActive',
    value: boolean
  ) => {
    setIsUpdating(true);
    
    try {
      // Create update object
      const updates = { [field]: value };
      
      // Make API call
      const result = await adminApi.updateConsultantStatus(consultantId, updates);
      
      // Update local state
      setConsultants(prev => prev.map(consultant => 
        consultant.id === consultantId 
          ? { ...consultant, ...updates, status: result.consultant.status }
          : consultant
      ));
      
      setFilteredConsultants(prev => prev.map(consultant => 
        consultant.id === consultantId 
          ? { ...consultant, ...updates, status: result.consultant.status }
          : consultant
      ));

      // Show success toast
      const fieldName = field === 'isEmailVerified' ? 'Email verification' :
                        field === 'isApprovedByAdmin' ? 'Admin approval' : 'Active status';
      
      toast({
        title: "Status Updated",
        description: `${fieldName} has been ${value ? 'enabled' : 'disabled'} successfully.`,
        variant: "default",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Handle filter
  const handleFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Effect to refetch when search or filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchConsultants();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter, pagination.page]);

  // Initial load
  useEffect(() => {
    fetchConsultants();
  }, []);

  return {
    consultants: filteredConsultants,
    isLoading,
    isUpdating,
    error,
    searchQuery,
    statusFilter,
    pagination,
    handleSearch,
    handleFilter,
    updateConsultantStatus,
    refresh: fetchConsultants,
  };
}

// Hook for admin statistics calculation
export function useAdminStats(consultants: ConsultantData[]) {
  return {
    totalConsultants: consultants.length,
    approvedConsultants: consultants.filter(c => c.isApprovedByAdmin).length,
    pendingApproval: consultants.filter(c => !c.isApprovedByAdmin && c.isActive).length,
    activeConsultants: consultants.filter(c => c.isActive).length,
    verifiedEmails: consultants.filter(c => c.isEmailVerified).length,
  };
}