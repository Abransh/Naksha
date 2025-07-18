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
/**
 * Meeting interfaces
 */
interface MeetingDetails {
    title: string;
    startTime: Date;
    duration: number;
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
 * Validate Microsoft access token with enhanced logging
 */
declare const validateAccessToken: (accessToken: string) => Promise<boolean>;
/**
 * Generate Microsoft Teams meeting
 */
export declare const generateTeamsMeeting: (meetingDetails: MeetingDetails, consultantAccessToken?: string) => Promise<MeetingResponse>;
/**
 * Main meeting link generation function - Teams Only
 */
export declare const generateMeetingLink: (platform: "TEAMS", meetingDetails: MeetingDetails, accessToken?: string) => Promise<MeetingResponse>;
/**
 * Update Teams meeting details
 */
export declare const updateMeeting: (platform: "TEAMS", meetingId: string, updates: Partial<MeetingDetails>, accessToken?: string) => Promise<boolean>;
/**
 * Cancel/delete Teams meeting
 */
export declare const cancelMeeting: (platform: "TEAMS", meetingId: string, accessToken?: string) => Promise<boolean>;
/**
 * Get Teams meeting information
 */
export declare const getMeetingInfo: (platform: "TEAMS", meetingId: string, accessToken?: string) => Promise<any>;
/**
 * Send meeting invitation to participants
 * Note: This creates a calendar event with the meeting link
 */
export declare const sendMeetingInvitation: (meetingDetails: MeetingDetails, meetingLink: string, accessToken: string) => Promise<boolean>;
/**
 * Generate Microsoft OAuth URL for Teams integration
 */
export declare const generateOAuthURL: (platform: "MICROSOFT", state?: string) => string;
/**
 * Test Microsoft Teams service connectivity
 */
export declare const testMeetingService: () => Promise<{
    microsoft: boolean;
}>;
export { validateAccessToken };
declare const _default: {
    generateMeetingLink: (platform: "TEAMS", meetingDetails: MeetingDetails, accessToken?: string) => Promise<MeetingResponse>;
    updateMeeting: (platform: "TEAMS", meetingId: string, updates: Partial<MeetingDetails>, accessToken?: string) => Promise<boolean>;
    cancelMeeting: (platform: "TEAMS", meetingId: string, accessToken?: string) => Promise<boolean>;
    getMeetingInfo: (platform: "TEAMS", meetingId: string, accessToken?: string) => Promise<any>;
    generateOAuthURL: (platform: "MICROSOFT", state?: string) => string;
    testMeetingService: () => Promise<{
        microsoft: boolean;
    }>;
    generateTeamsMeeting: (meetingDetails: MeetingDetails, consultantAccessToken?: string) => Promise<MeetingResponse>;
    sendMeetingInvitation: (meetingDetails: MeetingDetails, meetingLink: string, accessToken: string) => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=meetingService.d.ts.map