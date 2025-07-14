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
 * Generate Microsoft OAuth URL for Teams integration
 */
export declare const generateOAuthURL: (platform: "MICROSOFT", state?: string) => string;
/**
 * Test Microsoft Teams service connectivity
 */
export declare const testMeetingService: () => Promise<{
    microsoft: boolean;
}>;
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
};
export default _default;
//# sourceMappingURL=meetingService.d.ts.map