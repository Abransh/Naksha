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
    console.log('🔍 useAdminData - fetchConsultants called with params:', params);
    console.log('🔍 useAdminData - Current state:', { 
      page: pagination.page, 
      statusFilter, 
      searchQuery,
      isLoading 
    });
    
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = {
        page: params?.page || pagination.page,
        limit: pagination.limit,
        status: (params?.status || statusFilter) as 'all' | 'pending' | 'approved' | 'rejected',
        search: params?.search || searchQuery,
      };

      console.log('🔍 useAdminData - Calling adminApi.getAllConsultants with:', queryParams);
      const response = await adminApi.getAllConsultants(queryParams);
      console.log('✅ useAdminData - Got response:', response);
      
      setConsultants(response.data.consultants);
      setFilteredConsultants(response.data.consultants);
      setPagination({
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalCount: response.data.pagination.totalCount,
        totalPages: response.data.pagination.totalPages,
      });
      
      console.log('✅ useAdminData - Updated state with consultants:', response.data.consultants.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load consultants';
      console.error('❌ useAdminData - Error fetching consultants:', err);
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
    console.log('🔍 useAdminData - updateConsultantStatus called:', { consultantId, field, value });
    setIsUpdating(true);
    
    try {
      // Create update object
      const updates = { [field]: value };
      
      console.log('🔍 useAdminData - Calling adminApi.updateConsultantStatus with:', updates);
      // Make API call
      const result = await adminApi.updateConsultantStatus(consultantId, updates);
      console.log('✅ useAdminData - Update successful:', result);
      
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
      let errorMessage = 'Failed to update status';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // If there are validation details, show them
        if ((err as any).details?.details) {
          const validationErrors = (err as any).details.details;
          errorMessage = validationErrors.map((e: any) => e.message).join(', ');
        }
      }
      
      console.error('❌ useAdminData - Status update error:', err);
      
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