/**
 * Frontend Email Service
 * Provides interface for sending emails through the backend API
 * Integrates with the backend email service that uses Resend/SMTP
 */

// Email template types supported by the backend
export type EmailTemplate = 
  | 'consultant_welcome'
  | 'password_reset' 
  | 'session_confirmation'
  | 'quotation_shared'
  | 'quotation_sent_confirmation'
  | 'admin_new_consultant';

// Email sending interface
export interface SendEmailRequest {
  templateName: EmailTemplate;
  to: string;
  data: Record<string, any>;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

// Email response interface
export interface EmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
  error?: string;
}

// Quotation email data interface
export interface QuotationEmailData {
  clientName: string;
  consultantName: string;
  quotationName: string;
  description?: string;
  baseAmount: number;
  discountPercentage: number;
  finalAmount: number;
  currency: string;
  validUntil?: string;
  quotationNumber: string;
  emailMessage?: string;
  viewQuotationUrl: string;
  consultantEmail: string;
}

// Session confirmation email data interface
export interface SessionEmailData {
  clientName: string;
  consultantName: string;
  sessionTitle?: string;
  sessionDate: string;
  sessionTime: string;
  amount: number;
  meetingLink?: string;
}

/**
 * Email Service Class
 * Handles all email operations through backend API calls
 */
class EmailService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nakksha-guqgp.ondigitalocean.app';
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Send email through backend API
   * @param request Email request parameters
   * @returns Promise<EmailResponse>
   */
  private async sendEmailRequest(request: SendEmailRequest): Promise<EmailResponse> {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBaseUrl}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Email sending failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: result.message || 'Email sent successfully',
        emailId: result.data?.emailId,
      };

    } catch (error) {
      console.error('❌ Email sending error:', error);
      
      return {
        success: false,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send quotation to client
   * @param quotationData Quotation details for email template
   * @returns Promise<EmailResponse>
   */
  async sendQuotationToClient(quotationData: QuotationEmailData): Promise<EmailResponse> {
    return this.sendEmailRequest({
      templateName: 'quotation_shared',
      to: quotationData.consultantEmail, // This will be overridden by backend with client email
      data: {
        clientName: quotationData.clientName,
        consultantName: quotationData.consultantName,
        quotationName: quotationData.quotationName,
        description: quotationData.description,
        baseAmount: quotationData.baseAmount,
        discountPercentage: quotationData.discountPercentage,
        finalAmount: quotationData.finalAmount,
        currency: quotationData.currency,
        validUntil: quotationData.validUntil,
        quotationNumber: quotationData.quotationNumber,
        emailMessage: quotationData.emailMessage || '',
        viewQuotationUrl: quotationData.viewQuotationUrl,
        consultantEmail: quotationData.consultantEmail,
      },
    });
  }

  /**
   * Send quotation confirmation to consultant
   * @param quotationData Quotation details for confirmation email
   * @returns Promise<EmailResponse>
   */
  async sendQuotationConfirmation(quotationData: QuotationEmailData): Promise<EmailResponse> {
    return this.sendEmailRequest({
      templateName: 'quotation_sent_confirmation',
      to: quotationData.consultantEmail,
      data: {
        consultantName: quotationData.consultantName,
        clientName: quotationData.clientName,
        clientEmail: quotationData.consultantEmail, // Client email will be provided by backend
        quotationName: quotationData.quotationName,
        finalAmount: quotationData.finalAmount,
        currency: quotationData.currency,
        quotationNumber: quotationData.quotationNumber,
        sentDate: new Date().toLocaleDateString(),
      },
    });
  }

  /**
   * Send session confirmation email to client
   * @param sessionData Session details for email template
   * @returns Promise<EmailResponse>
   */
  async sendSessionConfirmation(sessionData: SessionEmailData): Promise<EmailResponse> {
    return this.sendEmailRequest({
      templateName: 'session_confirmation',
      to: sessionData.consultantName, // Backend will handle client email
      data: {
        clientName: sessionData.clientName,
        consultantName: sessionData.consultantName,
        sessionTitle: sessionData.sessionTitle,
        sessionDate: sessionData.sessionDate,
        sessionTime: sessionData.sessionTime,
        amount: sessionData.amount,
        meetingLink: sessionData.meetingLink,
      },
    });
  }

  /**
   * Send password reset email
   * @param email User email
   * @param resetData Reset link and user data
   * @returns Promise<EmailResponse>
   */
  async sendPasswordReset(email: string, resetData: { 
    firstName: string; 
    resetLink: string; 
  }): Promise<EmailResponse> {
    return this.sendEmailRequest({
      templateName: 'password_reset',
      to: email,
      data: {
        firstName: resetData.firstName,
        resetLink: resetData.resetLink,
      },
    });
  }

  /**
   * Send welcome email to new consultant
   * @param email Consultant email
   * @param welcomeData Welcome email data
   * @returns Promise<EmailResponse>
   */
  async sendConsultantWelcome(email: string, welcomeData: {
    firstName: string;
    verificationLink: string;
  }): Promise<EmailResponse> {
    return this.sendEmailRequest({
      templateName: 'consultant_welcome',
      to: email,
      data: {
        firstName: welcomeData.firstName,
        verificationLink: welcomeData.verificationLink,
      },
    });
  }

  /**
   * Validate email address format
   * @param email Email to validate
   * @returns boolean
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email service is available (basic connectivity test)
   * @returns Promise<boolean>
   */
  async isEmailServiceAvailable(): Promise<boolean> {
    try {
      const token = this.getAuthToken();
      if (!token) return false;

      const response = await fetch(`${this.apiBaseUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Email service connectivity check failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const emailService = new EmailService();

/**
 * Utility functions for email operations
 */

/**
 * Format quotation data for email templates
 * @param quotation Raw quotation data
 * @param consultant Consultant data
 * @returns Formatted quotation email data
 */
export const formatQuotationForEmail = (
  quotation: any,
  consultant: any
): QuotationEmailData => {
  return {
    clientName: quotation.clientName,
    consultantName: `${consultant.firstName} ${consultant.lastName}`,
    quotationName: quotation.quotationName,
    description: quotation.description,
    baseAmount: Number(quotation.baseAmount),
    discountPercentage: Number(quotation.discountPercentage || 0),
    finalAmount: Number(quotation.finalAmount),
    currency: quotation.currency || 'INR',
    validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : undefined,
    quotationNumber: quotation.quotationNumber,
    viewQuotationUrl: `${window.location.origin}/quotation/${quotation.id}`,
    consultantEmail: consultant.email,
  };
};

/**
 * Format session data for email templates
 * @param session Raw session data
 * @param consultant Consultant data
 * @returns Formatted session email data
 */
export const formatSessionForEmail = (
  session: any,
  consultant: any
): SessionEmailData => {
  return {
    clientName: session.clientName || session.client?.name,
    consultantName: `${consultant.firstName} ${consultant.lastName}`,
    sessionTitle: session.title || session.sessionType,
    sessionDate: new Date(session.scheduledDate).toLocaleDateString(),
    sessionTime: session.scheduledTime,
    amount: Number(session.amount),
    meetingLink: session.meetingLink,
  };
};

/**
 * Show email status toast notifications
 * @param result Email sending result
 * @param action Description of the action performed
 */
export const handleEmailResult = (result: EmailResponse, action: string = 'send email') => {
  if (result.success) {
    console.log(`✅ Successfully ${action}:`, result.message);
    // You can integrate with a toast notification library here
    // Example: toast.success(result.message);
  } else {
    console.error(`❌ Failed to ${action}:`, result.error);
    // Example: toast.error(result.error || `Failed to ${action}`);
  }
};

// Export default instance for convenience
export default emailService;