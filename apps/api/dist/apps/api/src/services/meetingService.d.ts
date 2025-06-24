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
 * Generate Google Meet link with calendar event
 */
export declare const generateGoogleMeetLink: (meetingDetails: MeetingDetails, consultantAccessToken?: string) => Promise<MeetingResponse>;
/**
 * Generate Microsoft Teams meeting
 */
export declare const generateTeamsMeeting: (meetingDetails: MeetingDetails, consultantAccessToken?: string) => Promise<MeetingResponse>;
/**
 * Generate Zoom meeting (if Zoom integration is available)
 */
export declare const generateZoomMeeting: (meetingDetails: MeetingDetails) => Promise<MeetingResponse>;
/**
 * Main meeting link generation function
 */
export declare const generateMeetingLink: (platform: "ZOOM" | "MEET" | "TEAMS", meetingDetails: MeetingDetails, accessToken?: string) => Promise<MeetingResponse>;
/**
 * Update meeting details
 */
export declare const updateMeeting: (platform: "ZOOM" | "MEET" | "TEAMS", meetingId: string, updates: Partial<MeetingDetails>, accessToken?: string) => Promise<boolean>;
/**
 * Cancel/delete meeting
 */
export declare const cancelMeeting: (platform: "ZOOM" | "MEET" | "TEAMS", meetingId: string, accessToken?: string) => Promise<boolean>;
/**
 * Get meeting information
 */
export declare const getMeetingInfo: (platform: "ZOOM" | "MEET" | "TEAMS", meetingId: string, accessToken?: string) => Promise<any>;
/**
 * Generate OAuth URLs for platform integration
 */
export declare const generateOAuthURL: (platform: "GOOGLE" | "MICROSOFT") => string;
/**
 * Test meeting service connectivity
 */
export declare const testMeetingService: () => Promise<{
    google: boolean;
    microsoft: boolean;
    zoom: boolean;
}>;
declare const _default: {
    generateMeetingLink: (platform: "ZOOM" | "MEET" | "TEAMS", meetingDetails: MeetingDetails, accessToken?: string) => Promise<MeetingResponse>;
    updateMeeting: (platform: "ZOOM" | "MEET" | "TEAMS", meetingId: string, updates: Partial<MeetingDetails>, accessToken?: string) => Promise<boolean>;
    cancelMeeting: (platform: "ZOOM" | "MEET" | "TEAMS", meetingId: string, accessToken?: string) => Promise<boolean>;
    getMeetingInfo: (platform: "ZOOM" | "MEET" | "TEAMS", meetingId: string, accessToken?: string) => Promise<any>;
    generateOAuthURL: (platform: "GOOGLE" | "MICROSOFT") => string;
    testMeetingService: () => Promise<{
        google: boolean;
        microsoft: boolean;
        zoom: boolean;
    }>;
    generateGoogleMeetLink: (meetingDetails: MeetingDetails, consultantAccessToken?: string) => Promise<MeetingResponse>;
    generateTeamsMeeting: (meetingDetails: MeetingDetails, consultantAccessToken?: string) => Promise<MeetingResponse>;
    generateZoomMeeting: (meetingDetails: MeetingDetails) => Promise<MeetingResponse>;
};
export default _default;
//# sourceMappingURL=meetingService.d.ts.map