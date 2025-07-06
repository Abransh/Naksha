/**
 * Frontend Email Service - Resend Integration
 * file path: apps/consultant-dashboard/src/lib/email.ts
 * 
 * IMPORTANT: Quotation emails are handled directly by backend endpoints:
 * - POST /api/v1/quotations (create)
 * - POST /api/v1/quotations/:id/send (send via Resend)
 * 
 * This service is for non-quotation email types only.
 * All email services now use Resend API as the primary provider.
 */

// Email template types supported by the backend (excluding quotations)
export type EmailTemplate = 
  | 'consultant_welcome'
  | 'password_reset' 
  | 'session_confirmation'
  | 'admin_new_consultant';

// Email response interface
export interface EmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
  error?: string;
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
   * NOTE: This method is temporarily disabled as we consolidate to Resend API.
   * Session confirmation emails should be handled by backend endpoints directly.
   * 
   * For quotations, use: POST /api/v1/quotations/:id/send (already uses Resend)
   * For sessions, use: POST /api/v1/sessions (backend handles email via Resend)
   * 
   * @deprecated Will be replaced with direct backend endpoint calls
   */
  private async sendEmailRequest(emailData: {
      templateName: string;
      to: string;
      data: Record<string, any>;
  }): Promise<EmailResponse> {
      console.warn('⚠️ Frontend email service is deprecated. Use backend endpoints directly.');
  
      // Example implementation for sending email
      try {
          const token = this.getAuthToken();
          if (!token) {
              throw new Error('Authentication token is missing');
          }
  
          const response = await fetch(`${this.apiBaseUrl}/api/v1/emails/send`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(emailData),
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to send email');
          }
  
          const responseData = await response.json();
          return {
              success: true,
              message: 'Email sent successfully',
              emailId: responseData.emailId,
          };
      } 
      catch (error: any) {
          console.error('Error sending email:', error);
          return {
              success: false,
              message: 'Failed to send email',
              error: error.message,
          };
      }
  }

  /**
   * DEPRECATED: Quotation emails are now handled by backend endpoints directly
   * 
   * Use these backend endpoints instead:
   * - Create quotation: POST /api/v1/quotations
   * - Send quotation: POST /api/v1/quotations/:id/send (uses Resend automatically)
   * 
   * @deprecated Use backend endpoints directly
   */
  async sendQuotationToClient(): Promise<EmailResponse> {
    return {
      success: false,
      message: 'Quotation emails are handled by backend endpoints. Use POST /api/v1/quotations/:id/send',
      error: 'Method deprecated - use backend endpoints'
    };
  }

  /**
   * DEPRECATED: Quotation confirmation emails are handled automatically by backend
   * 
   * @deprecated Use backend endpoints directly
   */
  async sendQuotationConfirmation(): Promise<EmailResponse> {
    return {
      success: false,
      message: 'Quotation confirmations are handled automatically by backend when using POST /api/v1/quotations/:id/send',
      error: 'Method deprecated - use backend endpoints'
    };
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
 * DEPRECATED: Quotation formatting is handled by backend Resend service
 * 
 * The backend automatically formats quotation data when using:
 * POST /api/v1/quotations/:id/send
 * 
 * @deprecated Use backend endpoints directly
 */
export const formatQuotationForEmail = (): any => {
  console.warn('⚠️ formatQuotationForEmail is deprecated. Backend handles quotation formatting automatically.');
  return null;
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
 * 
 * NOTE: For quotations, use the response from backend endpoints directly:
 * - POST /api/v1/quotations/:id/send returns emailStatus object with client/consultant results
 * 
 * @param result Email sending result
 * @param action Description of the action performed
 */
export const handleEmailResult = (result: EmailResponse, action: string = 'send email') => {
  if (result.success) {
    console.log(`✅ Successfully ${action} via Resend:`, result.message);
    // You can integrate with a toast notification library here
    // Example: toast.success(result.message);
  } else {
    console.error(`❌ Failed to ${action} via Resend:`, result.error);
    // Example: toast.error(result.error || `Failed to ${action}`);
  }
};

/**
 * NOTE: This frontend email service is now primarily for documentation.
 * 
 * For actual email sending, use backend endpoints directly:
 * - Quotations: POST /api/v1/quotations/:id/send (Resend integration complete)
 * - Sessions: POST /api/v1/sessions (backend handles email via Resend)
 * - Auth emails: Handled by backend auth routes (will be migrated to Resend in Phase 2)
 */
export default emailService;