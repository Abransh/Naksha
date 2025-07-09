/**
 * Microsoft Teams OAuth Callback Handler
 * 
 * This page handles the OAuth callback from Microsoft and exchanges
 * the authorization code for access tokens
 */

"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { teamsApi } from '@/lib/api';

function TeamsCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Microsoft Teams connection...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Microsoft OAuth authorization failed');
          
          // Send error to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'TEAMS_OAUTH_ERROR',
              error: errorDescription || 'Authorization failed'
            }, window.location.origin);
          }
          return;
        }

        // Check for required parameters
        if (!code) {
          setStatus('error');
          setMessage('Missing authorization code from Microsoft');
          
          if (window.opener) {
            window.opener.postMessage({
              type: 'TEAMS_OAUTH_ERROR',
              error: 'Missing authorization code'
            }, window.location.origin);
          }
          return;
        }

        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/teams/callback`;
        
        console.log('Exchanging code for tokens...');
        const result = await teamsApi.handleOAuthCallback(code, redirectUri);
        
        console.log('Teams OAuth successful:', result);
        
        setStatus('success');
        setMessage(`Successfully connected to Microsoft Teams as ${result.userEmail}`);
        
        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'TEAMS_OAUTH_SUCCESS',
            data: result
          }, window.location.origin);
        }
        
        // Close the popup after a short delay
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            // If not in popup, redirect to settings
            router.push('/dashboard/settings');
          }
        }, 2000);

      } catch (error) {
        console.error('Teams callback error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect Microsoft Teams';
        setStatus('error');
        setMessage(errorMessage);
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'TEAMS_OAUTH_ERROR',
            error: errorMessage
          }, window.location.origin);
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-100)]" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-[var(--primary-100)]';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--main-background)] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-[var(--black-80)] mb-4">
          Microsoft Teams Integration
        </h1>
        
        <p className={`text-lg ${getStatusColor()} mb-6`}>
          {message}
        </p>
        
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-[var(--primary-100)] rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-[var(--primary-100)] rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-[var(--primary-100)] rounded-full animate-pulse delay-200"></div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-sm text-[var(--black-60)]">
            This window will close automatically...
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-sm text-[var(--black-60)]">
              Please try again or contact support if the issue persists.
            </div>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-[var(--primary-100)] text-white rounded-lg hover:bg-[var(--primary-100)]/90 transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamsCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--main-background)] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary-100)]" />
          <span className="text-[var(--black-60)]">Loading...</span>
        </div>
      </div>
    }>
      <TeamsCallbackContent />
    </Suspense>
  );
}