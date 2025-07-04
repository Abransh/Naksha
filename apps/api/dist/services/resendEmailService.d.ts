/**
 * Resend Email Service for Quotation Management
 *
 * This service handles quotation email sending using the Resend API.
 * It provides professional email templates and reliable delivery for:
 * - Client quotation sharing
 * - Consultant confirmation emails
 * - Quotation status updates
 */
/**
 * Interface for quotation email data
 */
interface QuotationEmailData {
    quotationId: string;
    quotationNumber: string;
    quotationName: string;
    description?: string;
    baseAmount: number;
    discountPercentage: number;
    finalAmount: number;
    currency: string;
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
declare const _default: {
    sendQuotationToClient: (data: QuotationEmailData) => Promise<EmailResponse>;
    sendQuotationConfirmationToConsultant: (data: QuotationEmailData) => Promise<EmailResponse>;
    sendQuotationEmails: (data: QuotationEmailData) => Promise<{
        client: EmailResponse;
        consultant: EmailResponse;
    }>;
    validateResendConfig: () => {
        valid: boolean;
        errors: string[];
    };
};
export default _default;
//# sourceMappingURL=resendEmailService.d.ts.map