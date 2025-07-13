/**
 * Microsoft Teams OAuth Integration Routes
 * 
 * Handles OAuth flow for consultants to connect their Microsoft accounts
 * for Teams meeting integration
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { AuthenticatedRequest } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { AppError, NotFoundError } from '../../middleware/errorHandler';
import { generateOAuthURL } from '../../services/meetingService';
import axios from 'axios';

const router = Router();

/**
 * Validation schemas
 */
const exchangeCodeSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
});

/**
 * GET /api/v1/teams/oauth-url
 * Generate Microsoft OAuth URL for Teams integration
 */
router.get('/oauth-url',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      
      console.log(`🔗 [TEAMS] Generating OAuth URL for consultant: ${consultantId}`);
      
      // Validate environment configuration
      if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REDIRECT_URI) {
        console.error('❌ [TEAMS] Missing Microsoft OAuth configuration');
        throw new AppError('Microsoft Teams integration is not configured properly. Please contact support.', 500, 'TEAMS_CONFIG_ERROR');
      }
      
      // Generate Microsoft OAuth URL
      const oauthUrl = generateOAuthURL('MICROSOFT');
      
      // Add state parameter with consultant ID for security
      const urlWithState = `${oauthUrl}&state=${consultantId}`;
      
      console.log(`✅ [TEAMS] OAuth URL generated successfully for consultant: ${consultantId}`);
      
      res.json({
        success: true,
        data: {
          oauthUrl: urlWithState,
          debug: {
            consultantId,
            redirectUri: process.env.MICROSOFT_REDIRECT_URI,
            clientId: process.env.MICROSOFT_CLIENT_ID?.substring(0, 8) + '...'
          }
        }
      });

    } catch (error: any) {
      console.error('❌ [TEAMS] OAuth URL generation error:', {
        consultantId: req.user?.id,
        error: error.message,
        stack: error.stack,
        envVars: {
          hasClientId: !!process.env.MICROSOFT_CLIENT_ID,
          hasClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
          hasRedirectUri: !!process.env.MICROSOFT_REDIRECT_URI,
          hasTenantId: !!process.env.MICROSOFT_TENANT_ID
        }
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        `Failed to generate Teams OAuth URL: ${error.message}`, 
        500, 
        'TEAMS_OAUTH_URL_ERROR'
      );
    }
  }
);

/**
 * POST /api/teams/oauth-callback
 * Handle Microsoft OAuth callback and exchange code for tokens
 */
router.post('/oauth-callback',
  validateRequest(exchangeCodeSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { code, redirectUri } = req.body;
      const consultantId = req.user!.id;
      
      console.log(`📧 Processing Teams OAuth callback for consultant: ${consultantId}`);
      
      // Exchange authorization code for access token
      const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = tokenResponse.data;
      
      if (!tokens.access_token) {
        throw new AppError('Failed to obtain access token from Microsoft', 400, 'TEAMS_TOKEN_ERROR');
      }

      // Get user info from Microsoft Graph
      const userInfoResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      const userInfo = userInfoResponse.data;
      
      console.log(`✅ Teams OAuth successful for: ${userInfo.mail || userInfo.userPrincipalName}`);

      // Store tokens in database
      const prisma = getPrismaClient();
      
      await prisma.consultant.update({
        where: { id: consultantId },
        data: {
          // We'll add these fields to the database schema
          teamsAccessToken: tokens.access_token,
          teamsRefreshToken: tokens.refresh_token,
          teamsTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          teamsUserEmail: userInfo.mail || userInfo.userPrincipalName,
          teamsUserId: userInfo.id,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Teams tokens stored for consultant: ${consultantId}`);

      res.json({
        success: true,
        message: 'Microsoft Teams integration connected successfully',
        data: {
          userEmail: userInfo.mail || userInfo.userPrincipalName,
          displayName: userInfo.displayName,
          connectedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ [TEAMS] OAuth callback error:', {
        consultantId: req.user?.id,
        error: error.message,
        stack: error.stack,
        requestData: {
          code: req.body.code ? 'present' : 'missing',
          redirectUri: req.body.redirectUri
        }
      });
      
      if (axios.isAxiosError(error)) {
        const microsoftError = error.response?.data;
        console.error('❌ [TEAMS] Microsoft API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: microsoftError,
          url: error.config?.url
        });
        
        // Provide more specific error messages based on Microsoft's response
        let userMessage = 'Failed to connect Microsoft Teams';
        if (microsoftError?.error === 'invalid_grant') {
          userMessage = 'Authorization code has expired or is invalid. Please try connecting again.';
        } else if (microsoftError?.error === 'invalid_client') {
          userMessage = 'Microsoft Teams integration configuration error. Please contact support.';
        } else if (microsoftError?.error_description) {
          userMessage = `Microsoft OAuth error: ${microsoftError.error_description}`;
        }
        
        throw new AppError(userMessage, 400, 'TEAMS_OAUTH_ERROR');
      }
      
      // Handle Prisma database errors
      if (error.code === 'P2002') {
        throw new AppError('Consultant account not found or invalid', 404, 'CONSULTANT_NOT_FOUND');
      }
      
      throw new AppError(
        `Failed to connect Microsoft Teams: ${error.message}`, 
        500, 
        'TEAMS_OAUTH_CALLBACK_ERROR'
      );
    }
  }
);

/**
 * GET /api/teams/status
 * Check Teams integration status for consultant
 */
router.get('/status',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      
      const prisma = getPrismaClient();
      
      const consultant = await prisma.consultant.findUnique({
        where: { id: consultantId },
        select: {
          teamsAccessToken: true,
          teamsTokenExpiresAt: true,
          teamsUserEmail: true,
          teamsUserId: true,
          updatedAt: true
        }
      });

      if (!consultant) {
        throw new NotFoundError('Consultant');
      }

      const isConnected = !!(consultant.teamsAccessToken && consultant.teamsTokenExpiresAt);
      const isExpired = consultant.teamsTokenExpiresAt ? consultant.teamsTokenExpiresAt < new Date() : true;

      res.json({
        success: true,
        data: {
          isConnected,
          isExpired: isConnected ? isExpired : null,
          userEmail: consultant.teamsUserEmail,
          connectedAt: consultant.updatedAt,
          needsReconnection: isConnected && isExpired
        }
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('❌ Teams status check error:', error);
      throw new AppError('Failed to check Teams integration status', 500, 'TEAMS_STATUS_ERROR');
    }
  }
);

/**
 * DELETE /api/teams/disconnect
 * Disconnect Teams integration for consultant
 */
router.delete('/disconnect',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      
      console.log(`📧 Disconnecting Teams integration for consultant: ${consultantId}`);
      
      const prisma = getPrismaClient();
      
      await prisma.consultant.update({
        where: { id: consultantId },
        data: {
          teamsAccessToken: null,
          teamsRefreshToken: null,
          teamsTokenExpiresAt: null,
          teamsUserEmail: null,
          teamsUserId: null,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Teams integration disconnected for consultant: ${consultantId}`);

      res.json({
        success: true,
        message: 'Microsoft Teams integration disconnected successfully'
      });

    } catch (error) {
      console.error('❌ Teams disconnect error:', error);
      throw new AppError('Failed to disconnect Teams integration', 500, 'TEAMS_DISCONNECT_ERROR');
    }
  }
);

/**
 * POST /api/teams/refresh-token
 * Refresh expired Teams access token
 */
router.post('/refresh-token',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      
      const prisma = getPrismaClient();
      
      const consultant = await prisma.consultant.findUnique({
        where: { id: consultantId },
        select: {
          teamsRefreshToken: true,
          teamsTokenExpiresAt: true
        }
      });

      if (!consultant?.teamsRefreshToken) {
        throw new AppError('No Teams refresh token found. Please reconnect your Microsoft account.', 400, 'TEAMS_NO_REFRESH_TOKEN');
      }

      console.log(`🔄 Refreshing Teams token for consultant: ${consultantId}`);

      // Refresh the access token
      const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        refresh_token: consultant.teamsRefreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = tokenResponse.data;

      if (!tokens.access_token) {
        throw new AppError('Failed to refresh Teams access token', 400, 'TEAMS_REFRESH_ERROR');
      }

      // Update tokens in database
      await prisma.consultant.update({
        where: { id: consultantId },
        data: {
          teamsAccessToken: tokens.access_token,
          teamsRefreshToken: tokens.refresh_token || consultant.teamsRefreshToken, // Keep old refresh token if new one not provided
          teamsTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Teams token refreshed for consultant: ${consultantId}`);

      res.json({
        success: true,
        message: 'Teams access token refreshed successfully',
        data: {
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Teams token refresh error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Microsoft token refresh error:', error.response?.data);
        throw new AppError(`Failed to refresh Teams token: ${error.response?.data?.error_description || error.message}`, 400, 'TEAMS_REFRESH_API_ERROR');
      }
      
      throw new AppError('Failed to refresh Teams access token', 500, 'TEAMS_REFRESH_TOKEN_ERROR');
    }
  }
);

export default router;