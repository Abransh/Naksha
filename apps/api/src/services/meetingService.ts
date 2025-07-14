/**
 * File Path: apps/api/src/services/meetingService.ts
 * 
 * Microsoft Teams Meeting Service
 * 
 * Handles Microsoft Teams meeting integration for:
 * - Teams meeting creation
 * - Meeting notifications
 * - OAuth integration
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




/**
 * Generate Microsoft Teams meeting
 */
export const generateTeamsMeeting = async (
  meetingDetails: MeetingDetails,
  consultantAccessToken?: string
): Promise<MeetingResponse> => {
  try {
    if (!consultantAccessToken) {
      throw new Error('Microsoft Teams access token is required');
    }

    const startTime = meetingDetails.startTime.toISOString();
    const endTime = new Date(meetingDetails.startTime.getTime() + meetingDetails.duration * 60000).toISOString();

    const meetingPayload = {
      subject: meetingDetails.title,
      startDateTime: startTime,
      endDateTime: endTime,
      participants: {
        attendees: [
          {
            identity: {
              user: {
                id: meetingDetails.consultantEmail
              }
            },
            role: 'presenter'
          },
          {
            identity: {
              user: {
                id: meetingDetails.clientEmail
              }
            },
            role: 'attendee'
          }
        ]
      },
      audioConferencing: {
        tollNumber: '+91-22-6140-9999',
        conferenceId: Math.random().toString().substr(2, 8)
      },
      chatInfo: {
        threadId: `nakksha-${Date.now()}`
      }
    };

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      meetingPayload,
      {
        headers: {
          'Authorization': `Bearer ${consultantAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const meeting = response.data;

    console.log(`✅ Teams meeting created: ${meeting.id}`);

    return {
      meetingLink: meeting.joinWebUrl,
      meetingId: meeting.id,
      joinUrl: meeting.joinWebUrl,
      password: meeting.audioConferencing?.conferenceId
    };

  } catch (error: any) {
    console.error('❌ Teams meeting creation error:', error);
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
        }
      }
    );

    console.log(`✅ Teams meeting updated: ${meetingId}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to update Teams meeting:`, error);
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

    await axios.delete(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log(`✅ Teams meeting cancelled: ${meetingId}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to cancel Teams meeting:`, error);
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

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
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

  } catch (error) {
    console.error(`❌ Failed to get Teams meeting info:`, error);
    return null;
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

export default {
  generateMeetingLink,
  updateMeeting,
  cancelMeeting,
  getMeetingInfo,
  generateOAuthURL,
  testMeetingService,
  generateTeamsMeeting
};