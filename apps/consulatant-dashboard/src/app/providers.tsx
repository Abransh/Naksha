"use client";

/**
 * Providers for Nakksha Consulting Platform
 * Wraps the app with necessary context providers
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authService, type AuthState } from '@/lib/auth';
import { ApiError } from '@/lib/api';

// Query Provider
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Auth Context
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Clear error message
  const clearError = () => setError(null);

  // Update auth state
  const updateAuthState = (newState: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...newState }));
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      updateAuthState({ isLoading: true });
      
      const user = await authService.login(email, password);
      
      updateAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            errorMessage = 'Invalid email or password.';
            break;
          case 'ACCOUNT_DISABLED':
            errorMessage = 'Your account has been disabled. Please contact support.';
            break;
          case 'EMAIL_NOT_VERIFIED':
            errorMessage = 'Please verify your email address before logging in.';
            break;
          default:
            errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      throw new Error(errorMessage);
    }
  };

  // Signup function
  const signup = async (name: string, email: string, password: string): Promise<void> => {
    try {
      setError(null);
      updateAuthState({ isLoading: true });
      
      await authService.signup(name, email, password);
      
      updateAuthState({ isLoading: false });
    } catch (err) {
      let errorMessage = 'Signup failed. Please try again.';
      
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'USER_EXISTS':
          case 'EMAIL_EXISTS':
            errorMessage = 'An account with this email already exists.';
            break;
          case 'VALIDATION_ERROR':
            errorMessage = 'Please check your input data.';
            break;
          default:
            errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      updateAuthState({ isLoading: false });
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    try {
      const user = await authService.refreshUserData();
      updateAuthState({
        isAuthenticated: !!user,
        user,
      });
    } catch (err) {
      console.error('Failed to refresh user data:', err);
      updateAuthState({
        isAuthenticated: false,
        user: null,
      });
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const initialState = await authService.initialize();
        setAuthState(initialState);
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    signup,
    logout,
    refreshUser,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Combined providers component
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryProvider>
  );
}
