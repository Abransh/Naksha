/**
 * Authentication utilities for Nakksha Consulting Platform
 * Handles token management, session handling, and auth state
 */

import { authApi, type Consultant, type AuthTokens } from './api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

// Types
export interface AuthState {
  isAuthenticated: boolean;
  user: Consultant | null;
  isLoading: boolean;
}

// Token management utilities
const tokenManager = {
  /**
   * Store authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  },

  /**
   /**
   * Get access token
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    }
  },

  /**
   * Check if user has valid tokens
   */
  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken && refreshToken);
  },

  /**
   * Attempt to refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const tokens = await authApi.refreshToken(refreshToken);
      this.setTokens(tokens);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }
};

// User data management
 const userManager = {
  /**
   * Store user data
   */
  setUser(user: Consultant): void {
    if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Get stored user data
   */
  getUser(): Consultant | null {
    try {
      if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
      }
      return null; 
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  },

  /**
   * Clear user data
   */
  clearUser(): void {
    if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
    }
  },

  /**
   * Update user data
   */
  updateUser(updates: Partial<Consultant>): void {
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.setUser(updatedUser);
    }
  }
};

// Authentication service
 const authService = {
  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<Consultant> {
    try {
      console.log('🔐 AuthService: Attempting login API call...');
      const response = await authApi.login({ email, password });
      console.log('✅ AuthService: API response received:', response);
      console.log('🔍 Response structure:', {
        hasUser: 'user' in response,
        hasConsultant: 'consultant' in response,
        hasTokens: 'tokens' in response,
        keys: Object.keys(response)
      });
      
      // Store tokens and user data
      const userData = response.user || response.consultant;
      console.log('👤 User data to store:', userData);
      
      tokenManager.setTokens(response.tokens);
      userManager.setUser(userData);
      console.log('💾 AuthService: Tokens and user data stored');
      
      return userData;
    } catch (error) {
      console.error('❌ AuthService: Login failed:', error);
      throw error;
    }
  },

  /**
   * Register new user
   */
  async signup(name: string, email: string, password: string): Promise<Consultant> {
    try {
      const response = await authApi.signup({ name, email, password });
      
      // Note: No tokens returned on signup, user needs to verify email first
      return response.user;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call API to invalidate session
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear local storage
      tokenManager.clearTokens();
      userManager.clearUser();
    }
  },

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    const user = userManager.getUser();
    const hasTokens = tokenManager.hasValidTokens();
    
    return {
      isAuthenticated: !!(user && hasTokens),
      user,
      isLoading: false
    };
  },

  /**
   * Check if user can access dashboard
   */
  canAccessDashboard(): boolean {
    const user = userManager.getUser();
    const hasTokens = tokenManager.hasValidTokens();
    
    // User must be authenticated and approved by admin
    return !!(user && hasTokens && user.isApprovedByAdmin);
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      await authApi.verifyEmail(token);
      
      // Update user verification status
      const currentUser = userManager.getUser();
      if (currentUser) {
        userManager.updateUser({ isEmailVerified: true });
      }
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await authApi.forgotPassword(email);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await authApi.resetPassword(token, password);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  },

  /**
   * Refresh user data from server
   */
  async refreshUserData(): Promise<Consultant | null> {
    try {
      if (!tokenManager.hasValidTokens()) {
        return null;
      }

      const user = await authApi.getCurrentUser();
      userManager.setUser(user);
      return user;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      
      // If unauthorized, clear tokens
      if (error instanceof Error && error.message.includes('401')) {
        tokenManager.clearTokens();
        userManager.clearUser();
      }
      
      return null;
    }
  },

  /**
   * Initialize auth state (call on app startup)
   */
  async initialize(): Promise<AuthState> {
    // Check if we have stored tokens
    if (!tokenManager.hasValidTokens()) {
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false
      };
    }

    // Try to refresh user data
    const user = await this.refreshUserData();
    
    return {
      isAuthenticated: !!user,
      user,
      isLoading: false
    };
  }
};

// Auth status checks
 const authChecks = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return authService.getAuthState().isAuthenticated;
  },

  /**
   * Check if user email is verified
   */
  isEmailVerified(): boolean {
    const user = userManager.getUser();
    return user?.isEmailVerified ?? false;
  },

  /**
   * Check if user is approved by admin
   */
  isApprovedByAdmin(): boolean {
    const user = userManager.getUser();
    return user?.isApprovedByAdmin ?? false;
  },

  /**
   * Check if user profile is completed
   */
  isProfileCompleted(): boolean {
    const user = userManager.getUser();
    return user?.profileCompleted ?? false;
  },

  /**
   * Get user onboarding status
   */
  getOnboardingStatus(): {
    needsEmailVerification: boolean;
    needsAdminApproval: boolean;
    needsProfileCompletion: boolean;
    canAccessDashboard: boolean;
  } {
    return {
      needsEmailVerification: !this.isEmailVerified(),
      needsAdminApproval: !this.isApprovedByAdmin(),
      needsProfileCompletion: !this.isProfileCompleted(),
      canAccessDashboard: authService.canAccessDashboard()
    };
  }
};

// Export everything
export { authApi, tokenManager, userManager, authService, authChecks };
export default authService;