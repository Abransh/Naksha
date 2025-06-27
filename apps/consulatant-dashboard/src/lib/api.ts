/**
 * API Client for Nakksha Consulting Platform
 * Handles all API communication with the backend
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Types for API responses
export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
  error?: string;
  code?: string;
  details?: string;
}

export interface Consultant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  slug: string;
  isEmailVerified: boolean;
  isApprovedByAdmin?: boolean;
  profileCompleted?: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse {
  user: Consultant;
  tokens: AuthTokens;
}

export interface SignupResponse {
  user: Consultant;
  instructions: string;
}

// API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API request function with automatic token refresh
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    requireAuth?: boolean;
    isRetry?: boolean;
  } = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    requireAuth = false,
    isRetry = false
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if required
  if (requireAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include', // Include cookies
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    
    // Handle 401 unauthorized - try to refresh token
    if (response.status === 401 && requireAuth && !isRetry && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newTokens = refreshData.data;
            
            // Update stored tokens
            localStorage.setItem('accessToken', newTokens.accessToken);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            
            // Retry the original request with new token
            return apiRequest<T>(endpoint, { ...options, isRetry: true });
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear invalid tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error Response:', {
        status: response.status,
        url: response.url,
        data: data
      });
      
      throw new ApiError(
        response.status,
        data.code || 'API_ERROR',
        data.message || 'An error occurred',
        data.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      500,
      'NETWORK_ERROR',
      'Failed to connect to server. Please check your internet connection.',
    );
  }
}

// Authentication API methods
export const authApi = {
  /**
   * Register a new consultant account
   */
  async signup(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<SignupResponse> {
    const response = await apiRequest<ApiResponse<SignupResponse>>('/auth/signup', {
      method: 'POST',
      body: data,
    });
    return response.data!;
  },

  /**
   * Login with email and password
   */
  async login(data: {
    email: string;
    password: string;
  }): Promise<LoginResponse> {
    const response = await apiRequest<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: data,
    });
    return response.data!;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiRequest<ApiResponse<AuthTokens>>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    return response.data!;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiRequest('/auth/logout', {
      method: 'POST',
      requireAuth: true,
    });
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<Consultant> {
    const response = await apiRequest<ApiResponse<{ user: Consultant }>>('/auth/me', {
      requireAuth: true,
    });
    return response.data!.user;
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    await apiRequest(`/auth/verify-email/${token}`);
  },
};

// Dashboard data types
export interface DashboardOverview {
  revenue: {
    amount: number;
    change: number;
    withdrawn: number;
  };
  clients: {
    total: number;
    change: number;
    quotationsShared: number;
    quotationChange: number;
  };
  sessions: {
    all: number;
    pending: number;
    completed: number;
    change: number;
    abandonedPercentage: number;
  };
  services: {
    all: number;
    active: number;
    change: number;
  };
  revenueSplit: {
    fromNaksha: number;
    manuallyAdded: number;
    total: number;
  };
  recentSessions: Array<{
    id: string;
    title: string;
    clientName: string;
    clientEmail: string;
    amount: number;
    status: string;
    scheduledDate: string;
    createdAt: string;
  }>;
  chartData: Array<{
    date: string;
    sessions: number;
    revenue: number;
  }>;
  metrics: {
    totalRevenue: number;
    totalClients: number;
    totalSessions: number;
    completionRate: number;
    averageSessionValue: number;
  };
}

export interface DashboardStats {
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  sessionsByType: Array<{
    sessionType: string;
    _count: { sessionType: number };
    _sum: { amount: number };
  }>;
  paymentMethods: Array<{
    paymentMethod: string;
    _count: { paymentMethod: number };
    _sum: { amount: number };
  }>;
  topClients: Array<{
    id: string;
    name: string;
    email: string;
    totalSessions: number;
    totalAmountPaid: number;
  }>;
}

// Dashboard API methods
export const dashboardApi = {
  /**
   * Get dashboard overview data
   */
  async getOverview(): Promise<DashboardOverview> {
    const response = await apiRequest<ApiResponse<DashboardOverview>>('/dashboard/overview', {
      requireAuth: true,
    });
    return response.data!;
  },

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await apiRequest<ApiResponse<DashboardStats>>('/dashboard/stats', {
      requireAuth: true,
    });
    return response.data!;
  },
};

// Consultant Profile data types
export interface ConsultantProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  consultancySector?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  personalSessionTitle?: string;
  webinarSessionTitle?: string;
  description?: string;
  experienceMonths: number;
  personalSessionPrice?: number;
  webinarSessionPrice?: number;
  instagramUrl?: string;
  linkedinUrl?: string;
  xUrl?: string;
  profilePhotoUrl?: string;
  slug: string;
  isActive: boolean;
  isEmailVerified: boolean;
  subscriptionPlan: string;
  subscriptionExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  isProfileComplete: boolean;
  stats?: {
    totalSessions: number;
    totalClients: number;
    totalQuotations: number;
  };
}

export interface PublicConsultantProfile {
  consultant: {
    id: string;
    firstName: string;
    lastName: string;
    consultancySector?: string;
    personalSessionTitle?: string;
    webinarSessionTitle?: string;
    description?: string;
    experienceMonths: number;
    personalSessionPrice?: number;
    webinarSessionPrice?: number;
    instagramUrl?: string;
    linkedinUrl?: string;
    xUrl?: string;
    profilePhotoUrl?: string;
    slug: string;
    createdAt: string;
    experienceYears: number;
    stats: {
      completedSessions: number;
    };
  };
  availableSlots: Array<{
    id: string;
    sessionType: string;
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  consultancySector?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  personalSessionTitle?: string;
  webinarSessionTitle?: string;
  description?: string;
  experienceMonths?: number;
  personalSessionPrice?: number;
  webinarSessionPrice?: number;
  instagramUrl?: string;
  linkedinUrl?: string;
  xUrl?: string;
  slug?: string;
}

// Consultant API methods
export const consultantApi = {
  /**
   * Get consultant's own profile
   */
  async getProfile(): Promise<ConsultantProfile> {
    const response = await apiRequest<ApiResponse<{ consultant: ConsultantProfile }>>('/consultant/profile', {
      requireAuth: true,
    });
    return response.data!.consultant;
  },

  /**
   * Update consultant profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ConsultantProfile> {
    console.log('🔍 API: Sending profile update data:', data);
    
    const response = await apiRequest<ApiResponse<{ consultant: ConsultantProfile }>>('/consultant/profile', {
      method: 'PUT',
      body: data,
      requireAuth: true,
    });
    
    console.log('✅ API: Profile update response:', response);
    return response.data!.consultant;
  },

  /**
   * Get public consultant profile by slug
   */
  async getPublicProfile(slug: string): Promise<PublicConsultantProfile> {
    const response = await apiRequest<ApiResponse<PublicConsultantProfile>>(`/consultant/${slug}`);
    return response.data!;
  },

  /**
   * Upload profile photo
   */
  async uploadPhoto(file: File): Promise<{ profilePhotoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_URL}/consultant/upload-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        response.status,
        errorData.code || 'UPLOAD_ERROR',
        errorData.message || 'Failed to upload photo'
      );
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Check if slug is available
   */
  async checkSlugAvailability(slug: string): Promise<{ available: boolean; slug: string }> {
    const response = await apiRequest<ApiResponse<{ available: boolean; slug: string }>>(`/consultant/slug-check/${slug}`, {
      requireAuth: true,
    });
    return response.data!;
  },
};

// Export the main API object
export const api = {
  auth: authApi,
  dashboard: dashboardApi,
  consultant: consultantApi,
};

export default api;