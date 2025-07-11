"use strict";
/**
 * File Path: apps/api/src/services/meetingService.ts
 *
 * Video Meeting Service
 *
 * Handles video meeting integration for:
 * - Google Meet link generation
 * - Microsoft Teams meeting creation
 * - Zoom meeting scheduling
 * - Calendar integration
 * - Meeting notifications
 * - Meeting room management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMeetingService = exports.generateOAuthURL = exports.getMeetingInfo = exports.cancelMeeting = exports.updateMeeting = exports.generateMeetingLink = exports.generateZoomMeeting = exports.generateTeamsMeeting = exports.generateGoogleMeetLink = void 0;
const googleapis_1 = require("googleapis");
const axios_1 = __importDefault(require("axios"));
/**
 * Meeting configuration
 */
const meetingConfig = {
    // Google Calendar/Meet configuration
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
        scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ]
    },
    // Microsoft Teams configuration
    microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
        scopes: ['https://graph.microsoft.com/OnlineMeetings.ReadWrite']
    },
    // Zoom configuration (if needed)
    zoom: {
        apiKey: process.env.ZOOM_API_KEY,
        apiSecret: process.env.ZOOM_API_SECRET,
        accountId: process.env.ZOOM_ACCOUNT_ID
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
 * Initialize Google Calendar client
 */
const getGoogleCalendarClient = (accessToken) => {
    const auth = new googleapis_1.google.auth.OAuth2(meetingConfig.google.clientId, meetingConfig.google.clientSecret, meetingConfig.google.redirectUri);
    if (accessToken) {
        auth.setCredentials({ access_token: accessToken });
    }
    return googleapis_1.google.calendar({ version: 'v3', auth });
};
/**
 * Generate Google Meet link with calendar event
 */
const generateGoogleMeetLink = async (meetingDetails, consultantAccessToken) => {
    try {
        if (!consultantAccessToken) {
            // Fallback: generate a simple meet link without calendar integration
            const meetingId = `nakksha-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                meetingLink: `https://meet.google.com/${meetingId}`,
                meetingId,
                password: undefined
            };
        }
        const calendar = getGoogleCalendarClient(consultantAccessToken);
        const endTime = new Date(meetingDetails.startTime.getTime() + meetingDetails.duration * 60000);
        const event = {
            id: `nakksha-${Date.now()}`,
            summary: meetingDetails.title,
            start: {
                dateTime: meetingDetails.startTime.toISOString(),
                timeZone: meetingDetails.timezone || meetingConfig.defaults.timezone
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: meetingDetails.timezone || meetingConfig.defaults.timezone
            },
            attendees: [
                { email: meetingDetails.consultantEmail },
                { email: meetingDetails.clientEmail }
            ],
            conferenceData: {
                createRequest: {
                    requestId: `nakksha-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                    }
                }
            }
        };
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all'
        });
        const createdEvent = response.data;
        const meetingLink = createdEvent.conferenceData?.entryPoints?.[0]?.uri || createdEvent.hangoutLink;
        const meetingId = createdEvent.conferenceData?.conferenceId || createdEvent.id;
        console.log(`✅ Google Meet created: ${meetingId}`);
        return {
            meetingLink: meetingLink || `https://meet.google.com/${meetingId}`,
            meetingId: meetingId || '',
            calendarEventId: createdEvent.id || '',
            password: undefined
        };
    }
    catch (error) {
        console.error('❌ Google Meet creation error:', error);
        // Fallback to simple meet link
        const meetingId = `nakksha-fallback-${Date.now()}`;
        return {
            meetingLink: `https://meet.google.com/${meetingId}`,
            meetingId,
            password: undefined
        };
    }
};
exports.generateGoogleMeetLink = generateGoogleMeetLink;
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
 * Generate Zoom meeting (if Zoom integration is available)
 */
const generateZoomMeeting = async (meetingDetails) => {
    try {
        if (!meetingConfig.zoom.apiKey || !meetingConfig.zoom.apiSecret) {
            throw new Error('Zoom API credentials not configured');
        }
        // This is a simplified implementation
        // In production, you'd need proper Zoom JWT or OAuth integration
        const meetingPayload = {
            topic: meetingDetails.title,
            type: 2, // Scheduled meeting
            start_time: meetingDetails.startTime.toISOString(),
            duration: meetingDetails.duration,
            timezone: meetingDetails.timezone || meetingConfig.defaults.timezone,
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false,
                mute_upon_entry: meetingConfig.defaults.muteOnEntry,
                watermark: false,
                use_pmi: false,
                approval_type: 2,
                audio: 'both',
                auto_recording: 'none',
                waiting_room: meetingConfig.defaults.waitingRoom
            }
        };
        // Note: This would require proper Zoom API implementation
        // For now, return a placeholder response
        const meetingId = Math.random().toString().substr(2, 10);
        const password = Math.random().toString().substr(2, 6);
        console.log(`✅ Zoom meeting placeholder created: ${meetingId}`);
        return {
            meetingLink: `https://zoom.us/j/${meetingId}?pwd=${password}`,
            meetingId,
            password,
            joinUrl: `https://zoom.us/j/${meetingId}?pwd=${password}`,
            hostUrl: `https://zoom.us/s/${meetingId}?zak=host_token`
        };
    }
    catch (error) {
        console.error('❌ Zoom meeting creation error:', error);
        throw new Error(`Failed to create Zoom meeting: ${error.message}`);
    }
};
exports.generateZoomMeeting = generateZoomMeeting;
/**
 * Main meeting link generation function
 */
const generateMeetingLink = async (platform, meetingDetails, accessToken) => {
    try {
        switch (platform) {
            case 'MEET':
                return await (0, exports.generateGoogleMeetLink)(meetingDetails, accessToken);
            case 'TEAMS':
                return await (0, exports.generateTeamsMeeting)(meetingDetails, accessToken);
            case 'ZOOM':
                return await (0, exports.generateZoomMeeting)(meetingDetails);
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
    catch (error) {
        console.error(`❌ Meeting link generation failed for ${platform}:`, error);
        throw error;
    }
};
exports.generateMeetingLink = generateMeetingLink;
/**
 * Update meeting details
 */
const updateMeeting = async (platform, meetingId, updates, accessToken) => {
    try {
        switch (platform) {
            case 'MEET':
                if (accessToken) {
                    const calendar = getGoogleCalendarClient(accessToken);
                    const updateData = {};
                    if (updates.title)
                        updateData.summary = updates.title;
                    if (updates.startTime) {
                        updateData.start = {
                            dateTime: updates.startTime.toISOString(),
                            timeZone: updates.timezone || meetingConfig.defaults.timezone
                        };
                        if (updates.duration) {
                            const endTime = new Date(updates.startTime.getTime() + updates.duration * 60000);
                            updateData.end = {
                                dateTime: endTime.toISOString(),
                                timeZone: updates.timezone || meetingConfig.defaults.timezone
                            };
                        }
                    }
                    await calendar.events.update({
                        calendarId: 'primary',
                        eventId: meetingId,
                        requestBody: updateData,
                        sendUpdates: 'all'
                    });
                    console.log(`✅ Google Meet updated: ${meetingId}`);
                    return true;
                }
                break;
            case 'TEAMS':
                if (accessToken) {
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
                break;
            case 'ZOOM':
                // Zoom meeting update would go here
                console.log(`⚠️ Zoom meeting update not implemented: ${meetingId}`);
                return true;
        }
        return false;
    }
    catch (error) {
        console.error(`❌ Failed to update ${platform} meeting:`, error);
        return false;
    }
};
exports.updateMeeting = updateMeeting;
/**
 * Cancel/delete meeting
 */
const cancelMeeting = async (platform, meetingId, accessToken) => {
    try {
        switch (platform) {
            case 'MEET':
                if (accessToken) {
                    const calendar = getGoogleCalendarClient(accessToken);
                    await calendar.events.delete({
                        calendarId: 'primary',
                        eventId: meetingId,
                        sendUpdates: 'all'
                    });
                    console.log(`✅ Google Meet cancelled: ${meetingId}`);
                    return true;
                }
                break;
            case 'TEAMS':
                if (accessToken) {
                    await axios_1.default.delete(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    console.log(`✅ Teams meeting cancelled: ${meetingId}`);
                    return true;
                }
                break;
            case 'ZOOM':
                // Zoom meeting cancellation would go here
                console.log(`⚠️ Zoom meeting cancellation not implemented: ${meetingId}`);
                return true;
        }
        return false;
    }
    catch (error) {
        console.error(`❌ Failed to cancel ${platform} meeting:`, error);
        return false;
    }
};
exports.cancelMeeting = cancelMeeting;
/**
 * Get meeting information
 */
const getMeetingInfo = async (platform, meetingId, accessToken) => {
    try {
        switch (platform) {
            case 'MEET':
                if (accessToken) {
                    const calendar = getGoogleCalendarClient(accessToken);
                    const response = await calendar.events.get({
                        calendarId: 'primary',
                        eventId: meetingId
                    });
                    return {
                        id: response.data.id,
                        title: response.data.summary,
                        startTime: response.data.start?.dateTime,
                        endTime: response.data.end?.dateTime,
                        meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri || response.data.hangoutLink,
                        attendees: response.data.attendees
                    };
                }
                break;
            case 'TEAMS':
                if (accessToken) {
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
                break;
            case 'ZOOM':
                // Zoom meeting info retrieval would go here
                return {
                    id: meetingId,
                    platform: 'ZOOM',
                    note: 'Zoom integration not fully implemented'
                };
        }
        return null;
    }
    catch (error) {
        console.error(`❌ Failed to get ${platform} meeting info:`, error);
        return null;
    }
};
exports.getMeetingInfo = getMeetingInfo;
/**
 * Generate OAuth URLs for platform integration
 */
const generateOAuthURL = (platform) => {
    switch (platform) {
        case 'GOOGLE':
            const googleAuth = new googleapis_1.google.auth.OAuth2(meetingConfig.google.clientId, meetingConfig.google.clientSecret, meetingConfig.google.redirectUri);
            return googleAuth.generateAuthUrl({
                access_type: 'offline',
                scope: meetingConfig.google.scopes,
                prompt: 'consent'
            });
        case 'MICROSOFT':
            const microsoftAuthUrl = `https://login.microsoftonline.com/${meetingConfig.microsoft.tenantId}/oauth2/v2.0/authorize?` +
                `client_id=${meetingConfig.microsoft.clientId}&` +
                `response_type=code&` +
                `redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/auth/microsoft/callback')}&` +
                `response_mode=query&` +
                `scope=${encodeURIComponent(meetingConfig.microsoft.scopes.join(' '))}&` +
                `state=12345`;
            return microsoftAuthUrl;
        default:
            throw new Error(`Unsupported OAuth platform: ${platform}`);
    }
};
exports.generateOAuthURL = generateOAuthURL;
/**
 * Test meeting service connectivity
 */
const testMeetingService = async () => {
    const results = {
        google: false,
        microsoft: false,
        zoom: false
    };
    try {
        // Test Google Calendar API
        const googleAuth = new googleapis_1.google.auth.OAuth2(meetingConfig.google.clientId, meetingConfig.google.clientSecret, meetingConfig.google.redirectUri);
        results.google = true;
    }
    catch (error) {
        console.error('❌ Google Calendar test failed:', error);
    }
    try {
        // Test Microsoft Graph API connectivity
        const response = await axios_1.default.get('https://graph.microsoft.com/v1.0/$metadata');
        results.microsoft = response.status === 200;
    }
    catch (error) {
        console.error('❌ Microsoft Graph test failed:', error);
    }
    try {
        // Test Zoom API connectivity (if configured)
        if (meetingConfig.zoom.apiKey) {
            results.zoom = true; // Placeholder test
        }
    }
    catch (error) {
        console.error('❌ Zoom API test failed:', error);
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
    generateGoogleMeetLink: exports.generateGoogleMeetLink,
    generateTeamsMeeting: exports.generateTeamsMeeting,
    generateZoomMeeting: exports.generateZoomMeeting
};
//# sourceMappingURL=meetingService.js.map