// apps/consulatant-dashboard/src/hooks/useClients.ts

"use client";

import { useState, useEffect } from 'react';
import { clientApi } from '@/lib/api';

export interface Client {
  id: string;
  name: string;
  email: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isActive: boolean;
  totalSessions: number;
  totalAmountPaid: number;
  createdAt: string;
  updatedAt: string;
  stats: {
    activeSessions: number;
    completedSessions: number;
    lastSessionDate: string | null;
    averageSessionValue: number;
  };
  recentSessions: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    amount: number;
  }>;
}

export interface ClientSummaryStats {
  totalClients: number;
  activeClients: number;
  clientsWithActiveSessions: number;
  totalRevenue: number;
  averageRevenuePerClient: number;
}

export interface ClientPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ClientFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}

export function useClients(filters: ClientFilters = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [summaryStats, setSummaryStats] = useState<ClientSummaryStats>({
    totalClients: 0,
    activeClients: 0,
    clientsWithActiveSessions: 0,
    totalRevenue: 0,
    averageRevenuePerClient: 0
  });
  const [pagination, setPagination] = useState<ClientPagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const defaultFilters = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
        ...filters
      };

      console.log('🔍 Fetching clients with filters:', defaultFilters);

      const response = await clientApi.getClients(defaultFilters);

      console.log('✅ Clients fetched successfully:', {
        clientCount: response.clients.length,
        totalCount: response.pagination.totalCount,
        stats: response.summaryStats
      });

      setClients(response.clients);
      setSummaryStats(response.summaryStats);
      setPagination(response.pagination);

    } catch (err) {
      console.error('❌ Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = async (clientData: {
    name: string;
    email: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    notes?: string;
  }) => {
    try {
      console.log('➕ Creating new client:', clientData);
      
      const newClient = await clientApi.createClient(clientData);
      
      console.log('✅ Client created successfully:', newClient);
      
      // Refresh the clients list
      await fetchClients();
      
      return newClient;
    } catch (err) {
      console.error('❌ Error creating client:', err);
      throw err;
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      console.log('📝 Updating client:', { clientId, updates });
      
      const updatedClient = await clientApi.updateClient(clientId, updates);
      
      console.log('✅ Client updated successfully:', updatedClient);
      
      // Update the client in the local state
      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, ...updatedClient } : client
      ));
      
      return updatedClient;
    } catch (err) {
      console.error('❌ Error updating client:', err);
      throw err;
    }
  };

  const deactivateClient = async (clientId: string) => {
    try {
      console.log('🗑️ Deactivating client:', clientId);
      
      await clientApi.deactivateClient(clientId);
      
      console.log('✅ Client deactivated successfully');
      
      // Update the client in the local state
      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, isActive: false } : client
      ));
      
      // Update summary stats
      setSummaryStats(prev => ({
        ...prev,
        activeClients: prev.activeClients - 1
      }));
      
    } catch (err) {
      console.error('❌ Error deactivating client:', err);
      throw err;
    }
  };

  // Fetch clients when filters change
  useEffect(() => {
    fetchClients();
  }, [
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder,
    filters.search,
    filters.isActive
  ]);


  // Format currency helper
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return {
    clients,
    summaryStats,
    pagination,
    isLoading,
    error,
    refetch: fetchClients,
    createClient,
    updateClient,
    deactivateClient,
    formatCurrency,
    formatDate
  };
}

export function useClientSummary() {
  const [summaryStats, setSummaryStats] = useState<ClientSummaryStats>({
    totalClients: 0,
    activeClients: 0,
    clientsWithActiveSessions: 0,
    totalRevenue: 0,
    averageRevenuePerClient: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await clientApi.getClients({ limit: 1 }); // Just get summary stats
      setSummaryStats(response.summaryStats);

    } catch (err) {
      console.error('❌ Error fetching client summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch client summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return {
    summaryStats,
    isLoading,
    error,
    refetch: fetchSummary,
    formatCurrency
  };
}