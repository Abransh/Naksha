/**
 * API Client for Nakksha Consulting Platform
 * Handles all API communication with the backend
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
  async getOverview(timeframe: string = 'month'): Promise<DashboardOverview> {
    const params = new URLSearchParams({ timeframe });
    const response = await apiRequest<ApiResponse<DashboardOverview>>(`/dashboard/overview?${params}`, {
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
  personalSessionDescription?: string;
  webinarSessionTitle?: string;
  webinarSessionDescription?: string;
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
    personalSessionDescription?: string;
    webinarSessionTitle?: string;
    webinarSessionDescription?: string;
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
  personalSessionDescription?: string;
  webinarSessionTitle?: string;
  webinarSessionDescription?: string;
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
   * Upload profile photo to Cloudinary and update profile
   */
  async uploadPhoto(file: File): Promise<{ profilePhotoUrl: string }> {
    // Import Cloudinary upload function dynamically to avoid SSR issues
    const { uploadToCloudinary } = await import('../lib/cloudinary');
    
    try {
      // Upload to Cloudinary
      const cloudinaryResponse = await uploadToCloudinary(file);
      
      // Update profile with new photo URL via API
      const response = await apiRequest<ApiResponse<{ consultant: ConsultantProfile }>>('/consultant/profile', {
        method: 'PUT',
        body: { profilePhotoUrl: cloudinaryResponse.secure_url },
        requireAuth: true,
      });
      
      return { profilePhotoUrl: cloudinaryResponse.secure_url };
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw new ApiError(
        500,
        'UPLOAD_ERROR',
        error instanceof Error ? error.message : 'Failed to upload photo'
      );
    }
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

  /**
   * Teams Integration API methods
   */
  teams: {
    /**
     * Get Teams integration status
     */
    async getStatus(): Promise<{
      isConnected: boolean;
      isExpired: boolean;
      userEmail?: string;
      connectedAt?: string;
      needsReconnection: boolean;
      timeUntilExpiry?: number | null;
      tokenHealth?: 'good' | 'warning' | 'expired' | null;
    }> {
      const response = await apiRequest<ApiResponse<{
        isConnected: boolean;
        isExpired: boolean;
        userEmail?: string;
        connectedAt?: string;
        needsReconnection: boolean;
        timeUntilExpiry?: number | null;
        tokenHealth?: 'good' | 'warning' | 'expired' | null;
      }>>('/teams/status', {
        requireAuth: true,
      });
      return response.data!;
    },

    /**
     * Get Teams OAuth URL
     */
    async getOAuthUrl(): Promise<{ oauthUrl: string }> {
      const response = await apiRequest<ApiResponse<{ oauthUrl: string }>>('/teams/oauth-url', {
        requireAuth: true,
      });
      return response.data!;
    },

    /**
     * Complete Teams OAuth callback
     */
    async completeOAuth(code: string, redirectUri: string): Promise<{
      userEmail: string;
      displayName?: string;
      connectedAt: string;
    }> {
      const response = await apiRequest<ApiResponse<{
        userEmail: string;
        displayName?: string;
        connectedAt: string;
      }>>('/teams/oauth-callback', {
        method: 'POST',
        body: { code, redirectUri },
        requireAuth: true,
      });
      return response.data!;
    },

    /**
     * Refresh Teams access token
     */
    async refreshToken(): Promise<{ expiresAt: string }> {
      const response = await apiRequest<ApiResponse<{ expiresAt: string }>>('/teams/refresh-token', {
        method: 'POST',
        requireAuth: true,
      });
      return response.data!;
    },

    /**
     * Disconnect Teams integration
     */
    async disconnect(): Promise<void> {
      await apiRequest('/teams/disconnect', {
        method: 'DELETE',
        requireAuth: true,
      });
    },
  },
};

// Availability data types
export interface WeeklyAvailabilityPattern {
  id?: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  isActive: boolean;
  timezone: string;
  consultantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilitySlot {
  id: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isBlocked: boolean;
  consultantId: string;
  createdAt: string;
  updatedAt: string;
}

// Availability API methods
export const availabilityApi = {
  /**
   * Get all weekly availability patterns for consultant
   */
  async getPatterns(): Promise<WeeklyAvailabilityPattern[]> {
    const response = await apiRequest<ApiResponse<{ patterns: WeeklyAvailabilityPattern[] }>>('/availability/patterns', {
      requireAuth: true,
    });
    return response.data!.patterns;
  },

  /**
   * Create a single weekly availability pattern
   */
  async createPattern(pattern: Omit<WeeklyAvailabilityPattern, 'id' | 'consultantId' | 'createdAt' | 'updatedAt'>): Promise<WeeklyAvailabilityPattern> {
    const response = await apiRequest<ApiResponse<{ pattern: WeeklyAvailabilityPattern }>>('/availability/patterns', {
      method: 'POST',
      body: pattern,
      requireAuth: true,
    });
    return response.data!.pattern;
  },

  /**
   * Update an existing weekly availability pattern
   */
  async updatePattern(patternId: string, updates: Partial<WeeklyAvailabilityPattern>): Promise<WeeklyAvailabilityPattern> {
    const response = await apiRequest<ApiResponse<{ pattern: WeeklyAvailabilityPattern }>>(`/availability/patterns/${patternId}`, {
      method: 'PUT',
      body: updates,
      requireAuth: true,
    });
    return response.data!.pattern;
  },

  /**
   * Delete a weekly availability pattern
   */
  async deletePattern(patternId: string): Promise<void> {
    await apiRequest(`/availability/patterns/${patternId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /**
   * Create or update multiple weekly availability patterns (bulk operation)
   */
  async saveBulkPatterns(patterns: Omit<WeeklyAvailabilityPattern, 'id' | 'consultantId' | 'createdAt' | 'updatedAt'>[]): Promise<WeeklyAvailabilityPattern[]> {
    const response = await apiRequest<ApiResponse<{ patterns: WeeklyAvailabilityPattern[] }>>('/availability/patterns/bulk', {
      method: 'POST',
      body: { patterns },
      requireAuth: true,
    });
    return response.data!.patterns;
  },

  /**
   * Generate availability slots from weekly patterns
   */
  async generateSlots(data: {
    startDate: string; // YYYY-MM-DD format
    endDate: string; // YYYY-MM-DD format
    sessionType?: 'PERSONAL' | 'WEBINAR';
  }): Promise<{ slotsCreated: number; dateRange: { startDate: string; endDate: string } }> {
    const response = await apiRequest<ApiResponse<{ slotsCreated: number; dateRange: { startDate: string; endDate: string } }>>('/availability/generate-slots', {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
    return response.data!;
  },

  /**
   * Get available slots for a consultant (public endpoint)
   */
  async getAvailableSlots(consultantSlug: string, filters: {
    sessionType?: 'PERSONAL' | 'WEBINAR';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    slots: AvailabilitySlot[];
    slotsByDate: Record<string, AvailabilitySlot[]>;
    totalSlots: number;
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await apiRequest<ApiResponse<{
      slots: AvailabilitySlot[];
      slotsByDate: Record<string, AvailabilitySlot[]>;
      totalSlots: number;
    }>>(`/availability/slots/${consultantSlug}?${params}`);
    return response.data!;
  },
};

// Export the main API object
export const api = {
  auth: authApi,
  dashboard: dashboardApi,
  consultant: consultantApi,
  availability: availabilityApi,
};

// Profile completion calculation
export const calculateProfileCompletion = (profile: ConsultantProfile): number => {
  const requiredFields = [
    'firstName',
    'lastName', 
    'phoneNumber',
    'personalSessionTitle',
    'personalSessionPrice',
    'description'
  ];
  
  const completedFields = requiredFields.filter(field => {
    const value = profile[field as keyof ConsultantProfile];
    return value !== null && value !== undefined && value !== '';
  });
  
  return Math.round((completedFields.length / requiredFields.length) * 100);
};

// Session booking (public endpoint - no auth required)
export const bookSession = async (bookingData: {
  fullName: string;
  email: string;
  phone: string;
  sessionType: 'PERSONAL' | 'WEBINAR';
  selectedDate: string;
  selectedTime: string;
  duration: number;
  amount: number;
  clientNotes?: string;
  consultantSlug: string;
}) => {
  const response = await fetch(`${API_URL}/sessions/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to book session');
  }

  return response.json();
};

// Client API methods
export const clientApi = {
  /**
   * Get all clients for consultant
   */
  async getClients(filters: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    isActive?: boolean;
  } = {}): Promise<{
    clients: any[];
    pagination: any;
    summaryStats: any;
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await apiRequest<ApiResponse<any>>(`/clients?${params}`, {
      requireAuth: true,
    });
    return response.data!;
  },

  /**
   * Create a new client
   */
  async createClient(clientData: {
    name: string;
    email: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    notes?: string;
  }): Promise<any> {
    const response = await apiRequest<ApiResponse<{ client: any }>>('/clients', {
      method: 'POST',
      body: clientData,
      requireAuth: true,
    });
    return response.data!.client;
  },

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: {
    name?: string;
    email?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<any> {
    const response = await apiRequest<ApiResponse<{ client: any }>>(`/clients/${clientId}`, {
      method: 'PUT',
      body: updates,
      requireAuth: true,
    });
    return response.data!.client;
  },

  /**
   * Get a specific client
   */
  async getClient(clientId: string): Promise<any> {
    const response = await apiRequest<ApiResponse<{ client: any }>>(`/clients/${clientId}`, {
      requireAuth: true,
    });
    return response.data!.client;
  },

  /**
   * Deactivate a client
   */
  async deactivateClient(clientId: string): Promise<void> {
    await apiRequest(`/clients/${clientId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },
};

// Session API methods
export const sessionApi = {
  /**
   * Get all sessions for consultant
   */
  async getSessions(filters: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    paymentStatus?: string;
    sessionType?: string;
    platform?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await apiRequest<ApiResponse<any>>(`/sessions?${params}`, {
      requireAuth: true,
    });
    return response.data!;
  },

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<any> {
    const response = await apiRequest<ApiResponse<{ session: any }>>(`/sessions/${sessionId}`, {
      requireAuth: true,
    });
    return response.data!.session;
  },

  /**
   * Create a new session
   */
  async createSession(sessionData: {
    clientId: string;
    title: string;
    sessionType: 'PERSONAL' | 'WEBINAR';
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: number;
    amount: number;
    platform: 'ZOOM' | 'MEET' | 'TEAMS';
    notes?: string;
    paymentMethod: 'online' | 'cash' | 'bank_transfer';
  }): Promise<any> {
    const response = await apiRequest<ApiResponse<{ session: any }>>('/sessions', {
      method: 'POST',
      body: sessionData,
      requireAuth: true,
    });
    return response.data!.session;
  },

  /**
   * Update a session
   */
  async updateSession(sessionId: string, updates: {
    title?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    durationMinutes?: number;
    amount?: number;
    platform?: 'ZOOM' | 'MEET' | 'TEAMS';
    status?: string;
    paymentStatus?: string;
    notes?: string;
    consultantNotes?: string;
  }): Promise<any> {
    const response = await apiRequest<ApiResponse<{ session: any }>>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: updates,
      requireAuth: true,
    });
    return response.data!.session;
  },

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string): Promise<void> {
    await apiRequest(`/sessions/${sessionId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /**
   * Bulk update sessions
   */
  async bulkUpdateSessions(sessionIds: string[], updates: {
    status?: string;
    paymentStatus?: string;
    consultantNotes?: string;
  }): Promise<{ updatedCount: number; sessionIds: string[] }> {
    const response = await apiRequest<ApiResponse<{ updatedCount: number; sessionIds: string[] }>>('/sessions/bulk-update', {
      method: 'POST',
      body: { sessionIds, updates },
      requireAuth: true,
    });
    return response.data!;
  },

  /**
   * Get session analytics
   */
  async getAnalytics(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiRequest<ApiResponse<any>>(`/sessions/analytics?${params}`, {
      requireAuth: true,
    });
    return response.data!;
  },
};


export default api;