/**
 * Microsoft Teams OAuth Callback Handler
 * Handles the OAuth callback from Microsoft and completes the integration
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Callback handler component
const TeamsCallbackHandler = () => {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Debug logging for OAuth parameters
        console.log('Teams OAuth Callback Parameters:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          errorDescription,
          currentUrl: window.location.href,
          origin: window.location.origin
        });

        // Environment validation and debugging
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        console.log('Environment Configuration:', {
          apiUrl,
          isProduction: process.env.NODE_ENV === 'production',
          currentDomain: window.location.hostname,
          expectedApiDomain: apiUrl ? new URL(apiUrl).hostname : 'unknown'
        });

        // Handle OAuth error
        if (error) {
          setStatus('error');
          setMessage(errorDescription || error || 'OAuth authorization failed');
          
          // Notify parent window
          window.parent.postMessage({
            type: 'TEAMS_OAUTH_ERROR',
            error: errorDescription || error || 'OAuth authorization failed'
          }, window.location.origin);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required OAuth parameters');
          
          // Notify parent window
          window.parent.postMessage({
            type: 'TEAMS_OAUTH_ERROR',
            error: 'Missing required OAuth parameters'
          }, window.location.origin);
          return;
        }

        // Exchange code for tokens
        const token = localStorage.getItem('accessToken');
        
        // Debug token availability
        console.log('Token Validation:', {
          hasAccessToken: !!token,
          tokenLength: token?.length,
          localStorageKeys: Object.keys(localStorage),
          hasAlternativeTokens: {
            token: !!localStorage.getItem('token'),
            authToken: !!localStorage.getItem('authToken'),
            jwt: !!localStorage.getItem('jwt')
          }
        });
        
        if (!token) {
          setStatus('error');
          setMessage('Authentication token not found. Please login again and try connecting Teams.');
          
          // Notify parent window
          window.parent.postMessage({
            type: 'TEAMS_OAUTH_ERROR',
            error: 'Authentication token not found. Please login again and try connecting Teams.'
          }, window.location.origin);
          return;
        }

        // Validate API URL configuration
        if (!apiUrl) {
          throw new Error('API URL not configured. Please check environment variables.');
        }

        // Use the API client to ensure correct domain resolution
        const { consultantApi } = await import('../../../../lib/api');
        
        console.log('Making API call to complete OAuth...');
        
        const data = await consultantApi.teams.completeOAuth(
          code,
          window.location.origin + '/auth/teams/callback'
        );
        
        console.log('OAuth completion successful:', data);
        
        setStatus('success');
        setMessage('Microsoft Teams integration connected successfully!');
        setUserInfo(data);

        // Notify parent window
        window.parent.postMessage({
          type: 'TEAMS_OAUTH_SUCCESS',
          data: data
        }, window.location.origin);

        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (err) {
        console.error('Teams OAuth callback error:', err);
        
        // Enhanced error handling for different error types
        let errorMessage = 'Failed to complete OAuth flow';
        
        if (err instanceof Error) {
          errorMessage = err.message;
          
          // Check for specific API client errors
          if (err.message.includes('Failed to connect to server')) {
            errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
          } else if (err.message.includes('API URL not configured')) {
            errorMessage = 'Configuration error: API URL not properly set. Please contact support.';
          } else if (err.message.includes('NetworkError') || err.message.includes('CORS')) {
            errorMessage = 'Network error: Cross-origin request failed. Please ensure the API server is running and accessible.';
          } else if (err.message.includes('401')) {
            errorMessage = 'Authentication expired. Please login again and try connecting Teams.';
          } else if (err.message.includes('403')) {
            errorMessage = 'Access denied. Your account may not have permission to connect Teams.';
          } else if (err.message.includes('500')) {
            errorMessage = 'Server error. Please try again later or contact support.';
          }
        }
        
        // Log detailed error information for debugging
        console.error('Detailed error information:', {
          originalError: err,
          errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
          currentUrl: window.location.href
        });
        
        setStatus('error');
        setMessage(errorMessage);
        
        // Notify parent window
        window.parent.postMessage({
          type: 'TEAMS_OAUTH_ERROR',
          error: errorMessage
        }, window.location.origin);
      }
    };

    handleCallback();
  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600">Connecting to Microsoft Teams...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-800">Success!</h3>
              <p className="text-gray-600">{message}</p>
              {userInfo && (
                <div className="text-sm text-gray-500">
                  <p>Connected account: {userInfo.userEmail}</p>
                  {userInfo.displayName && (
                    <p>Display name: {userInfo.displayName}</p>
                  )}
                </div>
              )}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This window will close automatically in a few seconds.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <XCircle className="w-12 h-12 mx-auto text-red-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-800">Connection Failed</h3>
              <p className="text-gray-600">{message}</p>
            </div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please close this window and try again.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h18c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3zM10 17H7v-7h3v7zm0-8H7V6h3v3zm7 8h-3v-7h3v7zm0-8h-3V6h3v3z"/>
            </svg>
            Microsoft Teams Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

// Main page component with Suspense boundary
const TeamsCallbackPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <TeamsCallbackHandler />
    </Suspense>
  );
};

export default TeamsCallbackPage;
