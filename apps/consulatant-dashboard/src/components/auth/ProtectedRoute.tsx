"use client";

/**
 * Protected Route Component
 * Handles authentication and authorization checks for protected pages
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { authChecks } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdminApproval?: boolean;
  requireEmailVerification?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAdminApproval = true,
  requireEmailVerification = false,
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    setIsChecking(false);

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      router.replace(fallbackPath);
      return;
    }

    // Check email verification if required
    if (requireEmailVerification && !authChecks.isEmailVerified()) {
      router.replace('/auth/verify-email');
      return;
    }

    // Check admin approval if required
    if (requireAdminApproval && !authChecks.isApprovedByAdmin()) {
      router.replace('/dashboard/pending-approval');
      return;
    }
  }, [isAuthenticated, user, isLoading, requireAdminApproval, requireEmailVerification, fallbackPath, router]);

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or missing requirements
  if (!isAuthenticated || !user) {
    return null;
  }

  if (requireEmailVerification && !authChecks.isEmailVerified()) {
    return null;
  }

  if (requireAdminApproval && !authChecks.isApprovedByAdmin()) {
    return null;
  }

  return <>{children}</>;
}

// Component for displaying pending approval message
export function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const onboardingStatus = authChecks.getOnboardingStatus();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          
          <p className="text-gray-600 mb-6">
            Welcome {user?.firstName}! Your account has been created successfully, but it requires admin approval before you can access the dashboard.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Account Status:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Email Verified:</span>
                <span className={onboardingStatus.needsEmailVerification ? 'text-red-600' : 'text-green-600'}>
                  {onboardingStatus.needsEmailVerification ? 'Pending' : 'Verified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Admin Approval:</span>
                <span className={onboardingStatus.needsAdminApproval ? 'text-yellow-600' : 'text-green-600'}>
                  {onboardingStatus.needsAdminApproval ? 'Pending' : 'Approved'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              You will receive an email notification once your account is approved. This usually takes 1-2 business days.
            </p>
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}