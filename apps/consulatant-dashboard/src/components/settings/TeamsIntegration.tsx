/**
 * Microsoft Teams Integration Component
 * Handles OAuth connection for Teams meeting integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamsAutoRefresh } from '@/hooks/useTeamsAutoRefresh';

// Teams Integration Status Type with Auto-Refresh Support
interface TeamsStatus {
  isConnected: boolean;
  isExpired: boolean;
  userEmail?: string;
  connectedAt?: string;
  needsReconnection: boolean;
  timeUntilExpiry?: number | null;
  tokenHealth?: 'good' | 'warning' | 'expired' | 'refresh-needed' | null;
  shouldAutoRefresh?: boolean;
  hasRefreshToken?: boolean;
}

// Teams Integration Component
export const TeamsIntegration: React.FC = () => {
  const [status, setStatus] = useState<TeamsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Teams integration status
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the API client from lib/api.ts instead of direct fetch
      const { consultantApi } = await import('@/lib/api');
      const statusData = await consultantApi.teams.getStatus();
      setStatus(statusData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh hook for seamless token management
  const { manualRefresh, isAutoRefreshEnabled } = useTeamsAutoRefresh({
    status,
    onStatusChange: fetchStatus,
    enabled: true
  });

  // Connect to Microsoft Teams
  const connectTeams = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get OAuth URL using API client
      const { consultantApi } = await import('@/lib/api');
      const { oauthUrl } = await consultantApi.teams.getOAuthUrl();

      // Open OAuth popup
      const popup = window.open(
        oauthUrl,
        'teams-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please check your popup blocker.');
      }

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          fetchStatus(); // Refresh status after OAuth attempt
        }
      }, 1000);

      // Handle OAuth callback message
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'TEAMS_OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          setIsConnecting(false);
          toast.success('Microsoft Teams connected successfully!');
          fetchStatus();
        } else if (event.data.type === 'TEAMS_OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          setIsConnecting(false);
          const errorMessage = event.data.error || 'Failed to connect Microsoft Teams';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (!popup.closed) {
          popup.close();
          setIsConnecting(false);
        }
      }, 300000); // 5 minutes timeout

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Teams';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsConnecting(false);
    }
  };

  // Disconnect Teams integration
  const disconnectTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use API client for disconnect
      const { consultantApi } = await import('@/lib/api');
      await consultantApi.teams.disconnect();

      toast.success('Microsoft Teams disconnected successfully');
      fetchStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect Teams';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  // Load status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Render simplified connection status badge (no expiry warnings)
  const renderStatusBadge = () => {
    if (!status) return null;

    // Simplified status: just Connected or Disconnected
    if (!status.isConnected) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-300">
          <XCircle className="w-3 h-3 mr-1" />
          Not Connected
        </Badge>
      );
    }

    // Check if token is truly expired (not just needs refresh)
    const needsReconnection = status.isExpired && status.tokenHealth === 'expired';
    
    if (needsReconnection) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 flex items-center whitespace-nowrap">
          <XCircle className="w-3 h-3 mr-1" />
          Connection Required
        </Badge>
      );
    }

    // Show simple connected status with auto-refresh indicator
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>
        {isAutoRefreshEnabled && (
          <span className="text-xs text-green-600 italic">
           
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h18c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3zM10 17H7v-7h3v7zm0-8H7V6h3v3zm7 8h-3v-7h3v7zm0-8h-3V6h3v3z"/>
            </svg>
            Microsoft Teams Integration
          </span>
          {renderStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Simplified Connection Status */}
        {status && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {renderStatusBadge()}
            </div>
            
            {status.userEmail && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connected Account</span>
                <span className="text-sm text-gray-600">{status.userEmail}</span>
              </div>
            )}

            {status.connectedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connected At</span>
                <span className="text-sm text-gray-600">
                  {new Date(status.connectedAt).toLocaleString()}
                </span>
              </div>
            )}

            {/* Only show critical reconnection message */}
            {status.isConnected && status.isExpired && status.tokenHealth === 'expired' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Reconnection Required</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Your Teams integration needs to be reconnected to continue creating Teams meetings.
                </p>
              </div>
            )}

            {/* Auto-refresh status */}
            {status.isConnected && !status.isExpired && isAutoRefreshEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Auto-Managed Connection</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Your Teams integration is automatically maintained. No action needed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Simplified Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Connect button when not connected */}
          {!status?.isConnected && (
            <Button
              onClick={connectTeams}
              disabled={isConnecting || isLoading}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Microsoft Teams
                </>
              )}
            </Button>
          )}

          {/* Disconnect button when connected and working */}
          {status?.isConnected && (!status?.isExpired || status?.tokenHealth !== 'expired') && (
            <Button
              onClick={disconnectTeams}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Disconnect Teams
                </>
              )}
            </Button>
          )}

          {/* Reconnect button only when truly expired (not just needs refresh) */}
          {status?.isConnected && status?.isExpired && status?.tokenHealth === 'expired' && (
            <Button
              onClick={connectTeams}
              disabled={isConnecting || isLoading}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Reconnect Teams
                </>
              )}
            </Button>
          )}
        </div>

        {/* Updated Help Text */}
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
          <p className="mb-2">
            <strong>Microsoft Teams Integration</strong> allows you to automatically create Teams meetings when clients book sessions.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Connect your Microsoft account to enable Teams meetings</li>
            <li>Your connection is automatically maintained - no need to reconnect regularly</li>
            <li>Meetings are automatically created when you select Teams as the platform</li>
            <li>Meeting links are included in confirmation emails</li>
            <li>You can disconnect at any time in your settings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamsIntegration;