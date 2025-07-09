/**
 * Microsoft Teams Integration Component
 * 
 * Handles OAuth flow for connecting consultant's Microsoft account
 * for Teams meeting integration
 */

"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  RefreshCw,
  Unplug
} from 'lucide-react';
import { teamsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface TeamsStatus {
  isConnected: boolean;
  isExpired: boolean | null;
  userEmail: string | null;
  connectedAt: string | null;
  needsReconnection: boolean;
}

export function TeamsIntegration() {
  const [status, setStatus] = useState<TeamsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load Teams integration status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const teamsStatus = await teamsApi.getStatus();
      setStatus(teamsStatus);
    } catch (error) {
      console.error('Failed to load Teams status:', error);
      toast.error('Failed to load Teams integration status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get OAuth URL
      const { oauthUrl } = await teamsApi.getOAuthUrl();
      
      // Open OAuth flow in a popup
      const popup = window.open(
        oauthUrl,
        'teams-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please disable popup blockers.');
      }

      // Listen for OAuth callback
      const handleCallback = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'TEAMS_OAUTH_SUCCESS') {
          popup.close();
          window.removeEventListener('message', handleCallback);
          
          toast.success('Microsoft Teams connected successfully!');
          loadStatus(); // Reload status
        } else if (event.data.type === 'TEAMS_OAUTH_ERROR') {
          popup.close();
          window.removeEventListener('message', handleCallback);
          
          toast.error(event.data.error || 'Failed to connect Microsoft Teams');
        }
      };

      window.addEventListener('message', handleCallback);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleCallback);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Teams connection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Microsoft Teams');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await teamsApi.disconnect();
      toast.success('Microsoft Teams disconnected successfully');
      loadStatus(); // Reload status
    } catch (error) {
      console.error('Teams disconnection error:', error);
      toast.error('Failed to disconnect Microsoft Teams');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setIsRefreshing(true);
      await teamsApi.refreshToken();
      toast.success('Teams access token refreshed successfully');
      loadStatus(); // Reload status
    } catch (error) {
      console.error('Teams token refresh error:', error);
      toast.error('Failed to refresh Teams token. Please reconnect your account.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.isConnected && !status.isExpired) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    }

    if (status.isConnected && status.isExpired) {
      return (
        <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Token Expired
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Not Connected
      </Badge>
    );
  };

  const getActionButton = () => {
    if (!status) return null;

    if (!status.isConnected) {
      return (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-[#464EB8] hover:bg-[#464EB8]/90 text-white"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Microsoft Teams
            </>
          )}
        </Button>
      );
    }

    if (status.needsReconnection) {
      return (
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            variant="outline"
            className="border-[#464EB8] text-[#464EB8] hover:bg-[#464EB8]/10"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Token
              </>
            )}
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-[#464EB8] hover:bg-[#464EB8]/90 text-white"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Reconnect
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <Button
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        variant="outline"
        className="border-red-500 text-red-500 hover:bg-red-50"
      >
        {isDisconnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Disconnecting...
          </>
        ) : (
          <>
            <Unplug className="h-4 w-4 mr-2" />
            Disconnect
          </>
        )}
      </Button>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary-100)]" />
            <span className="ml-2 text-[var(--black-60)]">Loading Teams integration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-[var(--black-80)] mb-2">
              Microsoft Teams Integration
            </h3>
            <p className="text-sm text-[var(--black-60)] mb-3">
              Connect your Microsoft account to create Teams meetings for your sessions
            </p>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2">
            <img 
              src="https://img.icons8.com/color/48/microsoft-teams-2019.png" 
              alt="Microsoft Teams" 
              className="h-8 w-8"
            />
          </div>
        </div>

        {status && (
          <div className="bg-[var(--secondary-10)] rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--black-60)]">Status:</span>
                <span className="text-[var(--black-80)]">
                  {status.isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {status.userEmail && (
                <div className="flex justify-between">
                  <span className="text-[var(--black-60)]">Microsoft Account:</span>
                  <span className="text-[var(--black-80)]">{status.userEmail}</span>
                </div>
              )}
              {status.connectedAt && (
                <div className="flex justify-between">
                  <span className="text-[var(--black-60)]">Connected:</span>
                  <span className="text-[var(--black-80)]">
                    {new Date(status.connectedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {status.needsReconnection && (
                <div className="flex justify-between">
                  <span className="text-[var(--black-60)]">Action Required:</span>
                  <span className="text-red-600">Token expired, please reconnect</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--black-60)]">
            {status?.isConnected && !status.needsReconnection
              ? 'Teams meetings will be created automatically for your sessions'
              : 'Connect your Microsoft account to enable Teams meeting creation'
            }
          </div>
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}