/**
 * Quotations Management Hook
 * file path: apps/consultant-dashboard/src/hooks/useQuotations.ts
 * Handles all quotation-related operations and state management
 */

import { useState, useEffect, useCallback } from 'react';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = `${API_BASE_URL}/api/v1`;

// Types for quotations
export interface Quotation {
  id: string;
  quotationName: string;
  clientName: string;
  clientEmail: string;
  description: string;
  baseAmount: number;
  discountPercentage: number;
  finalAmount: number;
  currency: string;
  validUntil: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  quotationNumber: string;
  viewCount?: number;
  lastViewedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  daysUntilExpiry: number | null;
}

export interface QuotationSummaryStats {
  totalQuotations: number;
  draftQuotations: number;
  sentQuotations: number;
  acceptedQuotations: number;
  rejectedQuotations: number;
  expiredQuotations: number;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
}

export interface QuotationFilters {
  status?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  createdAfter?: string;
  createdBefore?: string;
}

export interface QuotationsPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UseQuotationsResult {
  quotations: Quotation[];
  summaryStats: QuotationSummaryStats | null;
  pagination: QuotationsPagination | null;
  isLoading: boolean;
  error: string | null;
  filters: QuotationFilters;
  refetch: () => Promise<void>;
  setFilters: (filters: QuotationFilters) => void;
  setPage: (page: number) => void;
  deleteQuotation: (id: string) => Promise<boolean>;
  updateQuotationStatus: (id: string, status: string) => Promise<boolean>;
  sendQuotation: (id: string, emailMessage?: string) => Promise<boolean>;
}

export const useQuotations = (initialFilters: QuotationFilters = {}): UseQuotationsResult => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [summaryStats, setSummaryStats] = useState<QuotationSummaryStats | null>(null);
  const [pagination, setPagination] = useState<QuotationsPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuotationFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);

  // Build API query parameters
  const buildQueryParams = useCallback((page: number = currentPage) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '10');
    params.append('sortBy', 'createdAt');
    params.append('sortOrder', 'desc');
    
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.minAmount !== undefined) params.append('minAmount', filters.minAmount.toString());
    if (filters.maxAmount !== undefined) params.append('maxAmount', filters.maxAmount.toString());
    if (filters.createdAfter) params.append('createdAfter', filters.createdAfter);
    if (filters.createdBefore) params.append('createdBefore', filters.createdBefore);
    
    return params.toString();
  }, [filters, currentPage]);

  // Fetch quotations from API
  const fetchQuotations = useCallback(async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = buildQueryParams(page);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/quotations?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch quotations');
      }

      const result = await response.json();
      const data = result.data;

      setQuotations(data.quotations || []);
      setSummaryStats(data.summaryStats || null);
      setPagination(data.pagination || null);

    } catch (err) {
      console.error('❌ Error fetching quotations:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setQuotations([]);
      setSummaryStats(null);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams, currentPage]);

  // Delete quotation
  const deleteQuotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/quotations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete quotation');
      }

      // Refresh quotations list
      await fetchQuotations();
      
      return true;

    } catch (err) {
      console.error('❌ Error deleting quotation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete quotation');
      return false;
    }
  }, [fetchQuotations]);

  // Update quotation status
  const updateQuotationStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/quotations/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update quotation status');
      }

      // Update local state
      setQuotations(prev => prev.map(quotation => 
        quotation.id === id ? { ...quotation, status: status as any } : quotation
      ));
      
      return true;

    } catch (err) {
      console.error('❌ Error updating quotation status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quotation status');
      return false;
    }
  }, []);

  // Send quotation to client
  const sendQuotation = useCallback(async (id: string, emailMessage: string = ''): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/quotations/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailMessage,
          includeAttachment: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send quotation');
      }

      // Update local state to reflect sent status
      setQuotations(prev => prev.map(quotation => 
        quotation.id === id ? { 
          ...quotation, 
          status: 'SENT' as any,
          sentAt: new Date().toISOString()
        } : quotation
      ));
      
      return true;

    } catch (err) {
      console.error('❌ Error sending quotation:', err);
      setError(err instanceof Error ? err.message : 'Failed to send quotation');
      return false;
    }
  }, []);

  // Update filters and refetch
  const updateFilters = useCallback((newFilters: QuotationFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Update page
  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Refetch data
  const refetch = useCallback(async () => {
    await fetchQuotations(currentPage);
  }, [fetchQuotations, currentPage]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchQuotations(currentPage);
  }, [fetchQuotations, currentPage]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQuotations(currentPage);
    }, 1200000);

    return () => clearInterval(interval);
  }, [fetchQuotations, currentPage]);

  return {
    quotations,
    summaryStats,
    pagination,
    isLoading,
    error,
    filters,
    refetch,
    setFilters: updateFilters,
    setPage,
    deleteQuotation,
    updateQuotationStatus,
    sendQuotation,
  };
};

// Helper function to format quotation status
export const formatQuotationStatus = (status: string): { label: string; color: string } => {
  const statusMap = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-800' },
    VIEWED: { label: 'Viewed', color: 'bg-yellow-100 text-yellow-800' },
    ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    EXPIRED: { label: 'Expired', color: 'bg-orange-100 text-orange-800' },
  };

  return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' };
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString()}`;
};

// Helper function to calculate days until expiry
export const getDaysUntilExpiry = (validUntil: string): number | null => {
  if (!validUntil) return null;
  
  const expiryDate = new Date(validUntil);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};