// Admin API Client for Consultant Management
// Handles all admin-specific API operations

import { ApiError } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Types based on backend API responses
export interface ConsultantData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  consultancySector?: string;
  profilePhotoUrl?: string;
  personalSessionPrice?: number;
  webinarSessionPrice?: number;
  isEmailVerified: boolean;
  isApprovedByAdmin: boolean;
  isActive: boolean;
  profileCompleted: boolean;
  subscriptionPlan: string;
  experienceMonths: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  stats: {
    totalSessions: number;
    totalClients: number;
    totalQuotations: number;
  };
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdminDashboardStats {
  overview: {
    totalConsultants: number;
    pendingApprovals: number;
    approvedConsultants: number;
    totalSessions: number;
    totalRevenue: number;
    recentSignups: number;
  };
  recentConsultants: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    consultancySector?: string;
    createdAt: string;
  }>;
  approvalRate: number;
}

export interface ConsultantsResponse {
  message: string;
  data: {
    consultants: ConsultantData[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

class AdminApiClient {
  // Admin authentication methods
  async login(email: string, password: string): Promise<{ admin: any; tokens: any; permissions: any }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.code || 'LOGIN_ERROR',
        errorData.message || 'Login failed'
      );
    }

    const data = await response.json();
    
    // Store tokens in localStorage
    localStorage.setItem('adminToken', data.data.tokens.accessToken);
    localStorage.setItem('adminRefreshToken', data.data.tokens.refreshToken);
    localStorage.setItem('adminUser', JSON.stringify(data.data.admin));
    
    return data.data;
  }

  logout(): void {
    // Clear all admin data from localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Redirect to admin login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  }

  getCurrentAdmin(): any | null {
    try {
      const adminData = localStorage.getItem('adminUser');
      return adminData ? JSON.parse(adminData) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('adminToken');
  }
  private async makeRequest<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      searchParams?: URLSearchParams;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, searchParams } = options;
    
    // Get auth token from localStorage
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    
    if (!token) {
      // Redirect to admin login if no token
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
    }

    const url = new URL(`${API_BASE_URL}/api/v1/admin${endpoint}`);
    if (searchParams) {
      url.search = searchParams.toString();
    }

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors
        if (response.status === 401) {
          // Clear invalid token and redirect to login
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminRefreshToken');
          localStorage.removeItem('adminUser');
          
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        }
        
        throw new ApiError(
          response.status,
          errorData.code || 'API_ERROR',
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }

  // Get admin dashboard overview
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await this.makeRequest<{ data: AdminDashboardStats }>('/dashboard');
    return response.data;
  }

  // Get all consultants with filtering and pagination
  async getAllConsultants(params: {
    page?: number;
    limit?: number;
    status?: 'all' | 'pending' | 'approved' | 'rejected';
    search?: string;
  } = {}): Promise<ConsultantsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.search?.trim()) searchParams.set('search', params.search.trim());

    return this.makeRequest<ConsultantsResponse>('/consultants', { searchParams });
  }

  // Get detailed consultant information
  async getConsultantDetails(consultantId: string): Promise<{ consultant: ConsultantData & { sessions: any[], clients: any[], quotations: any[] } }> {
    const response = await this.makeRequest<{ data: { consultant: ConsultantData & { sessions: any[], clients: any[], quotations: any[] } } }>(`/consultants/${consultantId}`);
    return response.data;
  }

  // Update consultant status (isEmailVerified, isApprovedByAdmin, isActive)
  async updateConsultantStatus(
    consultantId: string,
    updates: {
      isEmailVerified?: boolean;
      isApprovedByAdmin?: boolean;
      isActive?: boolean;
    }
  ): Promise<{ consultant: ConsultantData }> {
    // For approval/rejection, use the approve endpoint
    if ('isApprovedByAdmin' in updates) {
      return this.approveConsultant(consultantId, updates.isApprovedByAdmin!, 'Status updated by admin');
    }

    // For other updates, use the update endpoint
    const response = await this.makeRequest<{ data: { consultant: ConsultantData } }>(`/consultants/${consultantId}`, {
      method: 'PUT',
      body: updates,
    });
    
    return response.data;
  }

  // Approve or reject consultant
  async approveConsultant(
    consultantId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<{ consultant: ConsultantData }> {
    const response = await this.makeRequest<{ data: { consultant: ConsultantData } }>('/consultants/approve', {
      method: 'POST',
      body: {
        consultantId,
        approved,
        adminNotes: adminNotes || undefined,
      },
    });
    
    return response.data;
  }

  // Update consultant information
  async updateConsultant(
    consultantId: string,
    updates: {
      isActive?: boolean;
      personalSessionPrice?: number;
      webinarSessionPrice?: number;
      consultancySector?: string;
      adminNotes?: string;
    }
  ): Promise<{ consultant: ConsultantData }> {
    const response = await this.makeRequest<{ data: { consultant: ConsultantData } }>(`/consultants/${consultantId}`, {
      method: 'PUT',
      body: updates,
    });
    
    return response.data;
  }
}

// Export singleton instance
export const adminApi = new AdminApiClient();

// Types are already exported above