"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMeetingService = exports.generateOAuthURL = exports.getMeetingInfo = exports.cancelMeeting = exports.updateMeeting = exports.generateMeetingLink = exports.generateTeamsMeeting = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Microsoft Teams configuration
 */
const meetingConfig = {
    // Microsoft Teams configuration
    microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI,
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
 * Generate Microsoft Teams meeting
 */
const generateTeamsMeeting = async (meetingDetails, consultantAccessToken) => {
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
        const response = await axios_1.default.post('https://graph.microsoft.com/v1.0/me/onlineMeetings', meetingPayload, {
            headers: {
                'Authorization': `Bearer ${consultantAccessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const meeting = response.data;
        console.log(`✅ Teams meeting created: ${meeting.id}`);
        return {
            meetingLink: meeting.joinWebUrl,
            meetingId: meeting.id,
            joinUrl: meeting.joinWebUrl,
            password: meeting.audioConferencing?.conferenceId
        };
    }
    catch (error) {
        console.error('❌ Teams meeting creation error:', error);
        throw new Error(`Failed to create Teams meeting: ${error.message}`);
    }
};
exports.generateTeamsMeeting = generateTeamsMeeting;
/**
 * Main meeting link generation function - Teams Only
 */
const generateMeetingLink = async (platform, meetingDetails, accessToken) => {
    try {
        if (platform !== 'TEAMS') {
            throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
        }
        return await (0, exports.generateTeamsMeeting)(meetingDetails, accessToken);
    }
    catch (error) {
        console.error(`❌ Teams meeting generation failed:`, error);
        throw error;
    }
};
exports.generateMeetingLink = generateMeetingLink;
/**
 * Update Teams meeting details
 */
const updateMeeting = async (platform, meetingId, updates, accessToken) => {
    try {
        if (platform !== 'TEAMS') {
            throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
        }
        if (!accessToken) {
            throw new Error('Microsoft Teams access token is required for meeting updates');
        }
        const updatePayload = {};
        if (updates.title)
            updatePayload.subject = updates.title;
        if (updates.startTime)
            updatePayload.startDateTime = updates.startTime.toISOString();
        if (updates.startTime && updates.duration) {
            updatePayload.endDateTime = new Date(updates.startTime.getTime() + updates.duration * 60000).toISOString();
        }
        await axios_1.default.patch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, updatePayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Teams meeting updated: ${meetingId}`);
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to update Teams meeting:`, error);
        return false;
    }
};
exports.updateMeeting = updateMeeting;
/**
 * Cancel/delete Teams meeting
 */
const cancelMeeting = async (platform, meetingId, accessToken) => {
    try {
        if (platform !== 'TEAMS') {
            throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
        }
        if (!accessToken) {
            throw new Error('Microsoft Teams access token is required for meeting cancellation');
        }
        await axios_1.default.delete(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log(`✅ Teams meeting cancelled: ${meetingId}`);
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to cancel Teams meeting:`, error);
        return false;
    }
};
exports.cancelMeeting = cancelMeeting;
/**
 * Get Teams meeting information
 */
const getMeetingInfo = async (platform, meetingId, accessToken) => {
    try {
        if (platform !== 'TEAMS') {
            throw new Error(`Only Microsoft Teams is supported. Platform '${platform}' is not available.`);
        }
        if (!accessToken) {
            throw new Error('Microsoft Teams access token is required to get meeting info');
        }
        const response = await axios_1.default.get(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const meeting = response.data;
        return {
            id: meeting.id,
            title: meeting.subject,
            startTime: meeting.startDateTime,
            endTime: meeting.endDateTime,
            meetingLink: meeting.joinWebUrl,
            participants: meeting.participants
        };
    }
    catch (error) {
        console.error(`❌ Failed to get Teams meeting info:`, error);
        return null;
    }
};
exports.getMeetingInfo = getMeetingInfo;
/**
 * Generate Microsoft OAuth URL for Teams integration
 */
const generateOAuthURL = (platform, state) => {
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
exports.generateOAuthURL = generateOAuthURL;
/**
 * Test Microsoft Teams service connectivity
 */
const testMeetingService = async () => {
    const results = {
        microsoft: false
    };
    try {
        // Test Microsoft Graph API connectivity
        const response = await axios_1.default.get('https://graph.microsoft.com/v1.0/$metadata');
        results.microsoft = response.status === 200;
    }
    catch (error) {
        console.error('❌ Microsoft Graph test failed:', error);
    }
    return results;
};
exports.testMeetingService = testMeetingService;
exports.default = {
    generateMeetingLink: exports.generateMeetingLink,
    updateMeeting: exports.updateMeeting,
    cancelMeeting: exports.cancelMeeting,
    getMeetingInfo: exports.getMeetingInfo,
    generateOAuthURL: exports.generateOAuthURL,
    testMeetingService: exports.testMeetingService,
    generateTeamsMeeting: exports.generateTeamsMeeting
};
//# sourceMappingURL=meetingService.js.map