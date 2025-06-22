/**
 * API Client for Nakksha Consulting Platform
 * Handles all API communication with the backend
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Types for API responses
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
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
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    requireAuth = false
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if required
  if (requireAuth) {
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
    const data = await response.json();

    if (!response.ok) {
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

// Dashboard API methods
export const dashboardApi = {
  /**
   * Get dashboard overview data
   */
  async getOverview(): Promise<any> {
    const response = await apiRequest<ApiResponse>('/dashboard/overview', {
      requireAuth: true,
    });
    return response.data;
  },

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<any> {
    const response = await apiRequest<ApiResponse>('/dashboard/stats', {
      requireAuth: true,
    });
    return response.data;
  },
};

// Export the main API object
export const api = {
  auth: authApi,
  dashboard: dashboardApi,
};

export default api;