/**
 * Resend Email Service - Universal Email Platform Integration
 * file path: apps/api/src/services/resendEmailService.ts
 *
 * This service handles ALL email sending using the Resend API.
 * Replaces the old nodemailer-based emailService.ts for:
 * - Quotation emails (client sharing, consultant confirmations)
 * - Authentication emails (welcome, password reset, email verification)
 * - Session emails (confirmations, reminders)
 * - Admin notifications (new consultant registrations)
 * - System emails (alerts, reports)
 *
 * Benefits of Resend API:
 * - Superior deliverability rates
 * - Professional email tracking
 * - Template management
 * - Analytics and monitoring
 * - Scalable infrastructure
 */
/**
 * Email data interfaces for all email types
 */
interface QuotationEmailData {
    quotationId: string;
    quotationNumber: string;
    quotationName: string;
    description?: string;
    baseAmount: number;
    taxPercentage?: number;
    finalAmount: number;
    currency: string;
    gstNumber?: string;
    validUntil?: string;
    notes?: string;
    clientName: string;
    clientEmail: string;
    consultantName: string;
    consultantEmail: string;
    consultantCompany?: string;
    emailMessage?: string;
    viewQuotationUrl?: string;
    sentDate?: string;
}
interface AuthEmailData {
    firstName: string;
    lastName?: string;
    email: string;
    verificationLink?: string;
    resetLink?: string;
    consultantName?: string;
    signupDate?: string;
    adminDashboardUrl?: string;
}
interface SessionEmailData {
    sessionId: string;
    sessionTitle?: string;
    sessionType: string;
    clientName: string;
    clientEmail: string;
    consultantName: string;
    consultantEmail: string;
    sessionDate: string;
    sessionTime: string;
    amount: number;
    currency: string;
    meetingLink?: string;
    meetingPlatform?: string;
    sessionNotes?: string;
}
interface AdminEmailData {
    consultantName: string;
    consultantEmail: string;
    consultantId: string;
    signupDate: string;
    adminDashboardUrl: string;
    actionRequired?: string;
}
interface ClientEmailData {
    clientName: string;
    clientEmail: string;
    consultantName: string;
    consultantEmail: string;
    profileUrl?: string;
}
interface PaymentEmailData {
    clientName?: string;
    consultantName?: string;
    clientEmail?: string;
    consultantEmail?: string;
    amount: number;
    currency: string;
    transactionId?: string;
    paymentMethod?: string;
    sessionTitle?: string;
    sessionDate?: string;
    refundReason?: string;
}
/**
 * Email response interface
 */
interface EmailResponse {
    success: boolean;
    emailId?: string;
    error?: string;
    details?: any;
}
/**
 * Send quotation email to client using Resend API
 */
export declare const sendQuotationToClient: (data: QuotationEmailData) => Promise<EmailResponse>;
/**
 * Send confirmation email to consultant using Resend API
 */
export declare const sendQuotationConfirmationToConsultant: (data: QuotationEmailData) => Promise<EmailResponse>;
/**
 * Send both quotation and confirmation emails
 */
export declare const sendQuotationEmails: (data: QuotationEmailData) => Promise<{
    client: EmailResponse;
    consultant: EmailResponse;
}>;
/**
 * Validate Resend configuration
 */
export declare const validateResendConfig: () => {
    valid: boolean;
    errors: string[];
};
/**
 * Log Resend configuration status on startup
 */
export declare const logResendConfigStatus: () => void;
/**
 * Authentication Email Functions
 */
/**
 * Send welcome email to new consultant using Resend API
 */
export declare const sendConsultantWelcomeEmail: (data: AuthEmailData) => Promise<EmailResponse>;
/**
 * Send password reset email using Resend API
 */
export declare const sendPasswordResetEmail: (data: AuthEmailData) => Promise<EmailResponse>;
/**
 * Send session confirmation email using Resend API
 */
export declare const sendSessionConfirmationEmail: (data: SessionEmailData) => Promise<EmailResponse>;
/**
 * Send admin notification email using Resend API
 */
export declare const sendAdminNotificationEmail: (data: AdminEmailData) => Promise<EmailResponse>;
/**
 * Send consultant approval email
 * @param data - Consultant approval data
 * @returns Promise<EmailResponse>
 */
export declare const sendConsultantApprovedEmail: (data: AuthEmailData) => Promise<EmailResponse>;
/**
 * Send consultant rejection email
 * @param data - Consultant rejection data
 * @returns Promise<EmailResponse>
 */
export declare const sendConsultantRejectedEmail: (data: AuthEmailData & {
    reason?: string;
    supportEmail?: string;
}) => Promise<EmailResponse>;
/**
 * Send client welcome email
 * @param data - Client welcome data
 * @returns Promise<EmailResponse>
 */
export declare const sendClientWelcomeEmail: (data: ClientEmailData) => Promise<EmailResponse>;
/**
 * Send payment confirmation email
 * @param data - Payment confirmation data
 * @returns Promise<EmailResponse>
 */
export declare const sendPaymentConfirmationEmail: (data: PaymentEmailData) => Promise<EmailResponse>;
/**
 * Send refund notification email
 * @param data - Refund notification data
 * @returns Promise<EmailResponse>
 */
export declare const sendRefundNotificationEmail: (data: PaymentEmailData) => Promise<EmailResponse>;
declare const _default: {
    sendQuotationToClient: (data: QuotationEmailData) => Promise<EmailResponse>;
    sendQuotationConfirmationToConsultant: (data: QuotationEmailData) => Promise<EmailResponse>;
    sendQuotationEmails: (data: QuotationEmailData) => Promise<{
        client: EmailResponse;
        consultant: EmailResponse;
    }>;
    sendConsultantWelcomeEmail: (data: AuthEmailData) => Promise<EmailResponse>;
    sendPasswordResetEmail: (data: AuthEmailData) => Promise<EmailResponse>;
    sendConsultantApprovedEmail: (data: AuthEmailData) => Promise<EmailResponse>;
    sendConsultantRejectedEmail: (data: AuthEmailData & {
        reason?: string;
        supportEmail?: string;
    }) => Promise<EmailResponse>;
    sendSessionConfirmationEmail: (data: SessionEmailData) => Promise<EmailResponse>;
    sendAdminNotificationEmail: (data: AdminEmailData) => Promise<EmailResponse>;
    sendClientWelcomeEmail: (data: ClientEmailData) => Promise<EmailResponse>;
    sendPaymentConfirmationEmail: (data: PaymentEmailData) => Promise<EmailResponse>;
    sendRefundNotificationEmail: (data: PaymentEmailData) => Promise<EmailResponse>;
    validateResendConfig: () => {
        valid: boolean;
        errors: string[];
    };
    logResendConfigStatus: () => void;
};
export default _default;
//# sourceMappingURL=resendEmailService.d.ts.map