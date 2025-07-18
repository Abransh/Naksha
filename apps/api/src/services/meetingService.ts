/**
 * File Path: apps/api/src/services/meetingService.ts
 * 
 * Microsoft Teams Meeting Service
 * 
 * Handles Microsoft Teams meeting integration for:
 * - Teams meeting creation with proper error handling
 * - Meeting notifications and calendar invitations
 * - OAuth integration and token validation
 * 
 * FIXES IMPLEMENTED:
 * 1. Removed problematic participant identity structure that was causing 404 errors
 * 2. Added token validation before all API calls
 * 3. Enhanced error handling with specific error codes (401, 403, 404, 429)
 * 4. Added timeout configurations for all API calls
 * 5. Simplified meeting payload to avoid Microsoft Graph API conflicts
 * 6. Added sendMeetingInvitation function to handle participant notifications
 * 7. Improved error messages for better debugging
 * 
 * USAGE:
 * - Teams meetings are created without explicit participant assignment
 * - Use sendMeetingInvitation() to send calendar invites to participants
 * - All functions now validate access tokens before making API calls
 * - Enhanced error handling provides specific feedback for different failure scenarios
 */

import axios from 'axios';

/**
 * Microsoft Teams configuration
 */
const meetingConfig = {
  // Microsoft Teams configuration
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    scopes: [
      'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
      'https://graph.microsoft.com/Calendars.ReadWrite'
    ]
  },

  // Default meeting settings
  defaults: {
    duration: 60, // minutes
    timezone: 'Asia/Kolkata',
    allowRecording: true,
    waitingRoom: true,
    muteOnEntry: true
  }
};

/**
 * Meeting interfaces
 */
interface MeetingDetails {
  title: string;
  startTime: Date;
  duration: number; // in minutes
  consultantEmail: string;
  clientEmail: string;
  description?: string;
  timezone?: string;
}

interface MeetingResponse {
  meetingLink: string;
  meetingId: string;
  password?: string;
  calendarEventId?: string;
  joinUrl?: string;
  hostUrl?: string;
}

interface MeetingError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

interface TeamsAPIError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}




/**
 * Validate Microsoft access token with enhanced logging
 */
const validateAccessToken = async (accessToken: string): Promise<boolean> => {
  try {
    console.log('🔍 [TEAMS] Validating access token...');
    
    if (!accessToken) {
      console.error('❌ [TEAMS] No access token provided');
      return false;
    }

    // Try to decode JWT to check expiration (for debugging)
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = payload.exp;
        
        console.log(`🕐 [TEAMS] Token expiration check:`, {
          currentTime,
          expirationTime,
          isExpired: currentTime > expirationTime,
          expiresIn: expirationTime - currentTime,
          systemDate: new Date().toISOString(),
          tokenExpDate: new Date(expirationTime * 1000).toISOString()
        });
        
        if (currentTime > expirationTime) {
          console.error('❌ [TEAMS] Token is expired according to JWT payload');
          return false;
        }
      }
    } catch (decodeError) {
      console.warn('⚠️ [TEAMS] Could not decode JWT token for validation:', decodeError);
    }

    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log(`✅ [TEAMS] Token validation successful:`, {
      status: response.status,
      userEmail: response.data?.mail || response.data?.userPrincipalName,
      userId: response.data?.id
    });
    
    return response.status === 200;
  } catch (error: any) {
    console.error('❌ [TEAMS] Token validation failed:', {
      status: error?.response?.status,
      error: error?.response?.data?.error?.message || error.message,
      details: error?.response?.data
    });
    return false;
  }
};

/**
 * Generate Microsoft Teams meeting
 */
export const generateTeamsMeeting = async (
  meetingDetails: MeetingDetails,
  consultantAccessToken?: string
): Promise<MeetingResponse> => {
  try {
    console.log('🚀 [TEAMS] Starting Teams meeting creation:', {
      title: meetingDetails.title,
      startTime: meetingDetails.startTime.toISOString(),
      duration: meetingDetails.duration,
      consultantEmail: meetingDetails.consultantEmail,
      clientEmail: meetingDetails.clientEmail
    });

    if (!consultantAccessToken) {
      throw new Error('Microsoft Teams access token is required');
    }

    // Validate access token first
    const isTokenValid = await validateAccessToken(consultantAccessToken);
    if (!isTokenValid) {
      throw new Error('Invalid or expired Microsoft Teams access token');
    }

    const startTime = meetingDetails.startTime.toISOString();
    const endTime = new Date(meetingDetails.startTime.getTime() + meetingDetails.duration * 60000).toISOString();

    // Minimal meeting payload - Microsoft Graph API Error 9038 fix
    // Removed chatInfo and audioConferencing that were causing "post message to chat thread failure"
    const meetingPayload = {
      subject: meetingDetails.title,
      startDateTime: startTime,
      endDateTime: endTime,
      // Basic meeting settings only - let Teams handle chat and audio automatically
      allowedPresenters: 'organizer', // Only organizer can present
      allowAttendeeToEnableCamera: true,
      allowAttendeeToEnableMic: true,
      allowMeetingChat: 'enabled',
      allowTeamworkReactions: true
      // Removed audioConferencing - was causing thread creation issues
      // Removed chatInfo - custom threadId was causing Error 9038
    };

    console.log('📡 [TEAMS] Making API call to create meeting:', {
      endpoint: 'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      payload: meetingPayload,
      hasToken: !!consultantAccessToken,
      tokenLength: consultantAccessToken?.length
    });

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      meetingPayload,
      {
        headers: {
          'Authorization': `Bearer ${consultantAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const meeting = response.data;

    console.log(`✅ [TEAMS] Meeting created successfully:`, {
      meetingId: meeting.id,
      joinUrl: meeting.joinWebUrl,
      organizer: meeting.organizer?.identity?.user?.displayName,
      subject: meeting.subject,
      startTime: meeting.startDateTime,
      endTime: meeting.endDateTime
    });

    return {
      meetingLink: meeting.joinWebUrl,
      meetingId: meeting.id,
      joinUrl: meeting.joinWebUrl,
      password: meeting.audioConferencing?.conferenceId || undefined
    };

  } catch (error: any) {
    console.error('❌ [TEAMS] Meeting creation error:', {
      message: error.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
      config: {
        url: error?.config?.url,
        method: error?.config?.method,
        headers: error?.config?.headers ? 
          Object.keys(error.config.headers).reduce((acc, key) => {
            acc[key] = key === 'Authorization' ? '[REDACTED]' : error.config.headers[key];
            return acc;
          }, {} as any) : undefined
      }
    });
    
    // Enhanced error handling with specific error codes
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      switch (status) {
        case 401:
          throw new Error('Microsoft Teams authentication failed. Token may be expired or invalid.');
        case 403:
          throw new Error('Insufficient permissions to create Teams meeting. Please check OAuth scopes (OnlineMeetings.ReadWrite required).');
        case 404:
          throw new Error('Microsoft Teams endpoint not found. This may indicate token scope issues or user context problems.');
        case 429:
          throw new Error('Microsoft Teams rate limit exceeded. Please try again later.');
        default:
          throw new Error(`Microsoft Teams API error (${status}): ${errorData?.error?.message || error.message}`);
      }
    }
    
    throw new Error(`Failed to create Teams meeting: ${error.message}`);
  }
};


/**
 * Main meeting link generation function - Teams Only
 */
export const generateMeetingLink = async (
  platform: 'TEAMS',
  meetingDetails: MeetingDetails,
  accessToken?: string
): Promise<MeetingResponse> => {
  try {
    if (platform !== 'TEAMS') {
      throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
    }
    
    return await generateTeamsMeeting(meetingDetails, accessToken);
  } catch (error: any) {
    console.error(`❌ Teams meeting generation failed:`, error);
    throw error;
  }
};

/**
 * Update Teams meeting details
 */
export const updateMeeting = async (
  platform: 'TEAMS',
  meetingId: string,
  updates: Partial<MeetingDetails>,
  accessToken?: string
): Promise<boolean> => {
  try {
    if (platform !== 'TEAMS') {
      throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
    }

    if (!accessToken) {
      throw new Error('Microsoft Teams access token is required for meeting updates');
    }

    // Validate access token first
    const isTokenValid = await validateAccessToken(accessToken);
    if (!isTokenValid) {
      throw new Error('Invalid or expired Microsoft Teams access token');
    }

    const updatePayload: any = {};
    if (updates.title) updatePayload.subject = updates.title;
    if (updates.startTime) updatePayload.startDateTime = updates.startTime.toISOString();
    if (updates.startTime && updates.duration) {
      updatePayload.endDateTime = new Date(updates.startTime.getTime() + updates.duration * 60000).toISOString();
    }

    await axios.patch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      updatePayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`✅ Teams meeting updated: ${meetingId}`);
    return true;

  } catch (error: any) {
    console.error(`❌ Failed to update Teams meeting:`, error);
    
    // Enhanced error handling for updates
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          console.error('❌ Authentication failed during meeting update');
          break;
        case 403:
          console.error('❌ Insufficient permissions to update meeting');
          break;
        case 404:
          console.error('❌ Meeting not found or user does not have access');
          break;
        case 429:
          console.error('❌ Rate limit exceeded during meeting update');
          break;
      }
    }
    
    return false;
  }
};

/**
 * Cancel/delete Teams meeting
 */
export const cancelMeeting = async (
  platform: 'TEAMS',
  meetingId: string,
  accessToken?: string
): Promise<boolean> => {
  try {
    if (platform !== 'TEAMS') {
      throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
    }

    if (!accessToken) {
      throw new Error('Microsoft Teams access token is required for meeting cancellation');
    }

    // Validate access token first
    const isTokenValid = await validateAccessToken(accessToken);
    if (!isTokenValid) {
      throw new Error('Invalid or expired Microsoft Teams access token');
    }

    await axios.delete(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 30000
      }
    );
    
    console.log(`✅ Teams meeting cancelled: ${meetingId}`);
    return true;

  } catch (error: any) {
    console.error(`❌ Failed to cancel Teams meeting:`, error);
    
    // Enhanced error handling for cancellation
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          console.error('❌ Authentication failed during meeting cancellation');
          break;
        case 403:
          console.error('❌ Insufficient permissions to cancel meeting');
          break;
        case 404:
          console.error('❌ Meeting not found or already cancelled');
          break;
        case 429:
          console.error('❌ Rate limit exceeded during meeting cancellation');
          break;
      }
    }
    
    return false;
  }
};

/**
 * Get Teams meeting information
 */
export const getMeetingInfo = async (
  platform: 'TEAMS',
  meetingId: string,
  accessToken?: string
): Promise<any> => {
  try {
    if (platform !== 'TEAMS') {
      throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
    }

    if (!accessToken) {
      throw new Error('Microsoft Teams access token is required to get meeting info');
    }

    // Validate access token first
    const isTokenValid = await validateAccessToken(accessToken);
    if (!isTokenValid) {
      throw new Error('Invalid or expired Microsoft Teams access token');
    }

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 30000
      }
    );

    const meeting = response.data;
    return {
      id: meeting.id,
      title: meeting.subject,
      startTime: meeting.startDateTime,
      endTime: meeting.endDateTime,
      meetingLink: meeting.joinWebUrl,
      participants: meeting.participants
    };

  } catch (error: any) {
    console.error(`❌ Failed to get Teams meeting info:`, error);
    
    // Enhanced error handling for getting meeting info
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          console.error('❌ Authentication failed while getting meeting info');
          break;
        case 403:
          console.error('❌ Insufficient permissions to access meeting info');
          break;
        case 404:
          console.error('❌ Meeting not found or user does not have access');
          break;
        case 429:
          console.error('❌ Rate limit exceeded while getting meeting info');
          break;
      }
    }
    
    return null;
  }
};

/**
 * Send meeting invitation to participants
 * Note: This creates a calendar event with the meeting link
 */
export const sendMeetingInvitation = async (
  meetingDetails: MeetingDetails,
  meetingLink: string,
  accessToken: string
): Promise<boolean> => {
  try {
    // Validate access token first
    const isTokenValid = await validateAccessToken(accessToken);
    if (!isTokenValid) {
      throw new Error('Invalid or expired Microsoft Teams access token');
    }

    const startTime = meetingDetails.startTime.toISOString();
    const endTime = new Date(meetingDetails.startTime.getTime() + meetingDetails.duration * 60000).toISOString();

    const eventPayload = {
      subject: meetingDetails.title,
      body: {
        contentType: 'HTML',
        content: `
          <div>
            <h3>${meetingDetails.title}</h3>
            <p>${meetingDetails.description || 'Consultation session'}</p>
            <p><strong>Join Teams Meeting:</strong> <a href="${meetingLink}">Click here to join</a></p>
            <p><strong>Meeting Link:</strong> ${meetingLink}</p>
            <hr>
            <p><em>This meeting was created by Naksha Consulting Platform</em></p>
          </div>
        `
      },
      start: {
        dateTime: startTime,
        timeZone: meetingDetails.timezone || 'Asia/Kolkata'
      },
      end: {
        dateTime: endTime,
        timeZone: meetingDetails.timezone || 'Asia/Kolkata'
      },
      attendees: [
        {
          emailAddress: {
            address: meetingDetails.consultantEmail,
            name: 'Consultant'
          },
          type: 'required'
        },
        {
          emailAddress: {
            address: meetingDetails.clientEmail,
            name: 'Client'
          },
          type: 'required'
        }
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
      onlineMeeting: {
        joinUrl: meetingLink
      }
    };

    await axios.post(
      'https://graph.microsoft.com/v1.0/me/events',
      eventPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`✅ Meeting invitation sent to: ${meetingDetails.consultantEmail}, ${meetingDetails.clientEmail}`);
    return true;

  } catch (error: any) {
    console.error('❌ Failed to send meeting invitation:', error);
    
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          console.error('❌ Authentication failed while sending invitation');
          break;
        case 403:
          console.error('❌ Insufficient permissions to send calendar invitations');
          break;
        case 404:
          console.error('❌ Calendar endpoint not found');
          break;
        case 429:
          console.error('❌ Rate limit exceeded while sending invitation');
          break;
      }
    }
    
    return false;
  }
};

/**
 * Generate Microsoft OAuth URL for Teams integration
 */
export const generateOAuthURL = (platform: 'MICROSOFT', state?: string): string => {
  if (platform !== 'MICROSOFT') {
    throw new Error(`Only Microsoft Teams OAuth is supported. Platform '${platform}' is not available.`);
  }

  // Validate environment variables
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REDIRECT_URI) {
    throw new Error('Microsoft OAuth configuration missing: MICROSOFT_CLIENT_ID and MICROSOFT_REDIRECT_URI are required');
  }

  // Use provided state or default fallback
  const oauthState = state || 'default_state';

  const microsoftAuthUrl = `https://login.microsoftonline.com/${meetingConfig.microsoft.tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${meetingConfig.microsoft.clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(meetingConfig.microsoft.redirectUri)}&` +
    `response_mode=query&` +
    `scope=${encodeURIComponent('https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite')}&` +
    `state=${encodeURIComponent(oauthState)}`;

  return microsoftAuthUrl;
};

/**
 * Test Microsoft Teams service connectivity
 */
export const testMeetingService = async (): Promise<{
  microsoft: boolean;
}> => {
  const results = {
    microsoft: false
  };

  try {
    // Test Microsoft Graph API connectivity
    const response = await axios.get('https://graph.microsoft.com/v1.0/$metadata');
    results.microsoft = response.status === 200;
  } catch (error) {
    console.error('❌ Microsoft Graph test failed:', error);
  }

  return results;
};

// Export individual functions for better tree-shaking
export { 
  validateAccessToken
};

export default {
  generateMeetingLink,
  updateMeeting,
  cancelMeeting,
  getMeetingInfo,
  generateOAuthURL,
  testMeetingService,
  generateTeamsMeeting,
  sendMeetingInvitation
};