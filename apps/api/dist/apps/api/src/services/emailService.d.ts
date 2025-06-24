/**
 * File Path: apps/api/src/services/emailService.ts
 *
 * Email Service with Templates
 *
 * Handles all email communications in the platform:
 * - Email template management
 * - Transactional email sending
 * - Email delivery tracking
 * - Email queue management
 * - Template rendering with dynamic data
 * - Email analytics and logging
 */
/**
 * Email data interface
 */
interface EmailData {
    to: string;
    data: Record<string, any>;
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}
/**
 * Main email sending function
 */
export declare const sendEmail: (templateName: string, emailData: EmailData, consultantId?: string) => Promise<boolean>;
/**
 * Setup email templates and verify SMTP connection
 */
export declare const setupEmailTemplates: () => Promise<void>;
declare const _default: {
    sendEmail: (templateName: string, emailData: EmailData, consultantId?: string) => Promise<boolean>;
    setupEmailTemplates: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=emailService.d.ts.map