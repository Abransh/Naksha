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

import { Resend } from 'resend';
import { getPrismaClient } from '../config/database';

// Initialize Resend client lazily
let resend: Resend | null = null;

const getResendClient = (): Resend => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resend = new Resend(apiKey);
  }
  return resend;
};

/**
 * Email configuration for Resend
 */
const resendConfig = {
  from: process.env.EMAIL_FROM || 'nakksha Platform <booking@nakksha.in>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@nakksha.in',
  baseUrl: process.env.FRONTEND_URL || 'https://dashboard.nakksha.in'
};

/**
 * Email data interfaces for all email types
 */

// Quotation email data interface
interface QuotationEmailData {
  // Quotation details
  quotationId: string;
  quotationNumber: string;
  quotationName: string;
  description?: string;
  baseAmount: number;
  taxPercentage?: number; // Optional since not all quotations have tax
  finalAmount: number;
  currency: string;
  gstNumber?: string;
  validUntil?: string;
  notes?: string;
  
  // Client details
  clientName: string;
  clientEmail: string;
  
  // Consultant details
  consultantName: string;
  consultantEmail: string;
  consultantCompany?: string;
  
  // Additional data
  emailMessage?: string;
  viewQuotationUrl?: string;
  sentDate?: string;
}

// Authentication email data interface
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

// Session email data interface
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

// Admin notification email data interface
interface AdminEmailData {
  consultantName: string;
  consultantEmail: string;
  consultantId: string;
  signupDate: string;
  adminDashboardUrl: string;
  actionRequired?: string;
}

// Client email data interface
interface ClientEmailData {
  clientName: string;
  clientEmail: string;
  consultantName: string;
  consultantEmail: string;
  profileUrl?: string;
}

// Payment email data interface
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
 * Sanitize email address for use in Resend tags
 * Converts email to format that only contains ASCII letters, numbers, underscores, or dashes
 * @param email - Email address to sanitize
 * @returns Sanitized string safe for use in Resend tags
 */
const sanitizeEmailForTag = (email: string): string => {
  return email
    .replace('@', '_at_')
    .replace(/\./g, '_dot_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
};

/**
 * Professional quotation email template for clients
 */
const getClientQuotationEmailHtml = (data: QuotationEmailData): string => {
  const {
    quotationName,
    clientName,
    consultantName,
    consultantCompany,
    description,
    baseAmount,
    taxPercentage,
    gstNumber,
    finalAmount,
    currency,
    validUntil,
    quotationNumber,
    viewQuotationUrl,
    emailMessage
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation - ${quotationName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px 20px; }
        .quotation-card { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .quotation-details { display: flex; justify-content: space-between; flex-wrap: wrap; margin: 20px 0; }
        .detail-item { flex: 1; min-width: 200px; margin: 10px 0; }
        .detail-label { font-weight: 600; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { font-size: 18px; color: #333; margin-top: 5px; }
        .amount-section { text-align: center; background: #667eea; color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .amount-section .final-amount { font-size: 32px; font-weight: bold; margin: 10px 0; }
        .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; transition: background 0.3s; }
        .cta-button:hover { background: #218838; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; color: #666; font-size: 14px; }
        .message-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        @media (max-width: 600px) { .quotation-details { flex-direction: column; } .detail-item { min-width: 100%; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Professional Quotation</h1>
            <p>From ${consultantName}${consultantCompany ? ` at ${consultantCompany}` : ''}</p>
        </div>
        
        <div class="content">
            <p>Dear <strong>${clientName}</strong>,</p>
            
            <p>I'm pleased to share a professional quotation for your project requirements. Please find the details below:</p>
            
            <div class="quotation-card">
                <h3 style="margin-top: 0; color: #667eea;">${quotationName}</h3>
                <p><strong>Quotation #:</strong> ${quotationNumber}</p>
                ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
            </div>

            ${emailMessage ? `
            <div class="message-box">
                <h4 style="margin-top: 0;">Personal Message:</h4>
                <p style="margin-bottom: 0;">${emailMessage}</p>
            </div>
            ` : ''}
            
            <div class="quotation-details">
                <div class="detail-item">
                    <div class="detail-label">Base Amount</div>
                    <div class="detail-value">${currency} ${baseAmount.toLocaleString()}</div>
                </div>
                ${taxPercentage && taxPercentage > 0 ? `
                <div class="detail-item">
                    <div class="detail-label">Tax (GST)</div>
                    <div class="detail-value">${taxPercentage}% - ${currency} ${(baseAmount * taxPercentage! / 100).toLocaleString()}</div>
                </div>
                ` : ''}
                ${gstNumber ? `
                <div class="detail-item">
                    <div class="detail-label">GST Number</div>
                    <div class="detail-value">${gstNumber}</div>
                </div>
                ` : ''}
                ${validUntil ? `
                <div class="detail-item">
                    <div class="detail-label">Valid Until</div>
                    <div class="detail-value">${new Date(validUntil).toLocaleDateString()}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="amount-section">
                <div style="font-size: 18px; opacity: 0.9;">Total Amount (Including Tax)</div>
                <div class="final-amount">${currency} ${finalAmount.toLocaleString()}</div>
                ${taxPercentage && taxPercentage > 0 ? `<div style="opacity: 0.8;">Includes ${currency} ${(finalAmount - baseAmount).toLocaleString()} tax</div>` : ''}
            </div>
            
           
       
            <p>If you have any questions about this quotation or would like to discuss the project further, please don't hesitate to reach out to me.</p>
            
            <p>I look forward to working with you!</p>
            
            <p>Best regards,<br>
            <strong>${consultantName}</strong><br>
            ${consultantCompany || 'Independent Consultant'}</p>
        </div>
        
        <div class="footer">
            <p>This quotation was generated by nakksha.in</p>
            <p>If you received this email by mistake, please ignore it.</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Consultant confirmation email template
 */
const getConsultantConfirmationEmailHtml = (data: QuotationEmailData): string => {
  const {
    quotationName,
    clientName,
    clientEmail,
    finalAmount,
    currency,
    quotationNumber,
    sentDate
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation Sent Successfully</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Quotation Sent Successfully</h1>
            <p>Your quotation has been delivered to the client</p>
        </div>
        
        <div class="content">
            <div class="success-icon">📧</div>
            
            <p>Great news! Your quotation has been successfully sent to your client.</p>
            
            <div class="summary-card">
                <h3 style="margin-top: 0; color: #28a745;">Quotation Summary</h3>
                
                <div class="detail-row">
                    <span><strong>Quotation:</strong></span>
                    <span>${quotationName}</span>
                </div>
                
                <div class="detail-row">
                    <span><strong>Quotation #:</strong></span>
                    <span>${quotationNumber}</span>
                </div>
                
                <div class="detail-row">
                    <span><strong>Client:</strong></span>
                    <span>${clientName}</span>
                </div>
                
                <div class="detail-row">
                    <span><strong>Client Email:</strong></span>
                    <span>${clientEmail}</span>
                </div>
                
                <div class="detail-row">
                    <span><strong>Amount:</strong></span>
                    <span><strong>${currency} ${finalAmount.toLocaleString()}</strong></span>
                </div>
                
                <div class="detail-row">
                    <span><strong>Sent on:</strong></span>
                    <span>${sentDate || new Date().toLocaleDateString()}</span>
                </div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>The client will receive the quotation in their email inbox</li>
                <li>You'll be notified when the client views the quotation</li>
                <li>Follow up with the client if needed</li>
                <li>Track quotation status in your dashboard</li>
            </ul>
            
            <p>You can track the status of this quotation and manage all your quotations from your dashboard.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated confirmation from nakksha.in</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Authentication Email Templates
 */

/**
 * Consultant welcome email template with professional branding
 */
const getConsultantWelcomeEmailHtml = (data: AuthEmailData): string => {
  const { firstName, verificationLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to nakksha</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .cta-button { display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to nakksha</h1>
            <p>The Premier Consulting Platform</p>
        </div>
        
        <div class="content">
            <p>Hello ${firstName}!</p>
            
            <p>Welcome to nakksha! Please verify your email address to get started:</p>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="cta-button">Verify Email Address</a>
            </div>
            
            <p><strong>Important:</strong> After email verification, your account will require admin approval before you can access the full consultant dashboard.</p>
        </div>
        
        <div class="footer">
            <p>The nakksha Team</p>
            <p>© 2024 nakksha.in All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Password reset email template
 */
const getPasswordResetEmailHtml = (data: AuthEmailData): string => {
  const { firstName, resetLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .reset-button { display: inline-block; background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="reset-button">Reset My Password</a>
            </div>
            
            <p><strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated security email from nakksha.in</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Consultant approval email template
 */
const getConsultantApprovedEmailHtml = (data: AuthEmailData): string => {
  const { firstName, adminDashboardUrl } = data;
  const dashboardUrl = adminDashboardUrl || process.env.CONSULTANT_DASHBOARD_URL || 'https://dashboard.nakksha.in';
  const loginUrl = `${dashboardUrl}/auth/login`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Approved - Welcome to nakksha.in</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .dashboard-button { display: inline-block; background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to nakksha.in!</h1>
        </div>
        
        <div class="celebration">🚀✨🎊</div>
        
        <div class="content">
            <p>Congratulations ${firstName}!</p>
            
            <p>We're thrilled to inform you that your consultant application has been <strong>approved</strong>! You're now part of the nakksha.in family.</p>
            
            <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>What's Next?</h3>
                <ul>
                    <li>Access your consultant dashboard</li>
                    <li>Complete your profile setup</li>
                    <li>Start accepting client sessions</li>
                    <li>Create and share quotations</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${loginUrl}" class="dashboard-button">Access Your Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <p>Welcome aboard!</p>
        </div>
        
        <div class="footer">
            <p>Start building your consulting business with nakksha.in</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Consultant rejection email template
 */
const getConsultantRejectedEmailHtml = (data: AuthEmailData & { reason?: string; supportEmail?: string }): string => {
  const { firstName, reason, supportEmail } = data;
  const defaultReason = 'Your application did not meet our current requirements';
  const defaultSupportEmail = 'support@nakksha.in';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update on Your nakksha.in Application</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .support-button { display: inline-block; background: #F59E0B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Application Update</h1>
        </div>
        
        <div class="content">
            <p>Dear ${firstName},</p>
            
            <p>Thank you for your interest in joining nakksha.in as a consultant.</p>
            
            <p>After careful review of your application, we regret to inform you that we are unable to approve your consultant account at this time.</p>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Reason:</strong> ${reason || defaultReason}</p>
            </div>
            
            <p>We encourage you to consider reapplying in the future as our requirements and opportunities may evolve.</p>
            
            <p>If you have any questions about this decision or would like feedback on your application, please don't hesitate to reach out to our support team.</p>
            
            <div style="text-align: center;">
                <a href="mailto:${supportEmail || defaultSupportEmail}" class="support-button">Contact Support</a>
            </div>
            
            <p>Thank you for considering nakksha.in.</p>
        </div>
        
        <div class="footer">
            <p>We appreciate your interest in our platform</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Client welcome email template
 */
const getClientWelcomeEmailHtml = (data: ClientEmailData): string => {
  const { clientName, consultantName, consultantEmail, profileUrl } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to nakksha.in</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .profile-button { display: inline-block; background: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to nakksha.in!</h1>
        </div>
        
        <div class="content">
            <p>Hello ${clientName},</p>
            
            <p>Welcome to nakksha.in! You've been connected with <strong>${consultantName}</strong>, your dedicated consultant.</p>
            
            <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Your Consultant Details:</h3>
                <p><strong>Name:</strong> ${consultantName}</p>
                <p><strong>Email:</strong> ${consultantEmail}</p>
                ${profileUrl ? `<p><strong>Profile:</strong> <a href="${profileUrl}">View Profile</a></p>` : ''}
            </div>
            
            <p>Your consultant will reach out to you soon to discuss your requirements and schedule sessions.</p>
            
            ${profileUrl ? `
            <div style="text-align: center;">
                <a href="${profileUrl}" class="profile-button">View Consultant Profile</a>
            </div>
            ` : ''}
            
            <p>If you have any questions, feel free to contact your consultant directly or reach out to our support team.</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing nakksha.in for your consulting needs</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Payment confirmation email template
 */
const getPaymentConfirmationEmailHtml = (data: PaymentEmailData): string => {
  const { clientName, consultantName, amount, currency, transactionId, paymentMethod, sessionTitle, sessionDate } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Payment Confirmed</h1>
        </div>
        
        <div class="content">
            <p>Dear ${clientName || 'Client'},</p>
            
            <p>Your payment has been successfully processed!</p>
            
            <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Payment Details:</h3>
                <p><strong>Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
                <p><strong>Transaction ID:</strong> ${transactionId || 'N/A'}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod || 'Online'}</p>
                ${sessionTitle ? `<p><strong>Service:</strong> ${sessionTitle}</p>` : ''}
                ${sessionDate ? `<p><strong>Session Date:</strong> ${sessionDate}</p>` : ''}
                ${consultantName ? `<p><strong>Consultant:</strong> ${consultantName}</p>` : ''}
            </div>
            
            <p>You will receive session details and meeting information separately.</p>
            
            <p>Thank you for your payment!</p>
        </div>
        
        <div class="footer">
            <p>This is a payment confirmation from nakksha.in</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Refund notification email template
 */
const getRefundNotificationEmailHtml = (data: PaymentEmailData): string => {
  const { clientName, consultantName, amount, currency, transactionId, refundReason, sessionTitle } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Refund Processed</h1>
        </div>
        
        <div class="content">
            <p>Dear ${clientName || 'Client'},</p>
            
            <p>Your refund has been processed successfully.</p>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Refund Details:</h3>
                <p><strong>Refund Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
                <p><strong>Original Transaction:</strong> ${transactionId || 'N/A'}</p>
                ${sessionTitle ? `<p><strong>Service:</strong> ${sessionTitle}</p>` : ''}
                ${consultantName ? `<p><strong>Consultant:</strong> ${consultantName}</p>` : ''}
                ${refundReason ? `<p><strong>Reason:</strong> ${refundReason}</p>` : ''}
            </div>
            
            <p>The refund will be credited to your original payment method within 5-7 business days.</p>
            
            <p>If you have any questions about this refund, please contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>This is a refund notification from nakksha.in</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Session confirmation email template
 */
const getSessionConfirmationEmailHtml = (data: SessionEmailData): string => {
  const { sessionTitle, sessionType, clientName, consultantName, sessionDate, sessionTime, amount, currency, meetingLink } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .meeting-button { display: inline-block; background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Session Confirmed</h1>
        </div>
        
        <div class="content">
            <p>Dear ${clientName},</p>
            
            <p>Your session with <strong>${consultantName}</strong> has been confirmed!</p>
            
            <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>${sessionTitle || sessionType}</h3>
                <p><strong>📅 Date:</strong> ${sessionDate}</p>
                <p><strong>🕒 Time:</strong> ${sessionTime}</p>
                <p><strong>💰 Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
            </div>
            
            ${meetingLink ? `
            <div style="text-align: center;">
                <a href="${meetingLink}" class="meeting-button">Join Meeting</a>
            </div>
            ` : ''}
            
            <p><strong>Important:</strong> Please join the meeting 5-10 minutes before the scheduled time.</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing nakksha.in</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Admin notification email template
 */
const getAdminNotificationEmailHtml = (data: AdminEmailData): string => {
  const { consultantName, consultantEmail, signupDate, adminDashboardUrl } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Consultant Registration</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .action-button { display: inline-block; background: #7C3AED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🆕 New Consultant Registration</h1>
            <p>Admin Action Required</p>
        </div>
        
        <div class="content">
            <p>A new consultant has registered and requires approval:</p>
            
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${consultantName}</p>
                <p><strong>Email:</strong> ${consultantEmail}</p>
                <p><strong>Registration Date:</strong> ${signupDate}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${adminDashboardUrl}" class="action-button">Review Application</a>
            </div>
        </div>
        
        <div class="footer">
            <p>nakksha Admin System</p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Send quotation email to client using Resend API
 */
export const sendQuotationToClient = async (data: QuotationEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending quotation email to client: ${data.clientEmail}`);
    console.log(`📧 Using FROM email: ${resendConfig.from}`);
    console.log(`📧 Using REPLY-TO email: ${data.consultantEmail}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.clientEmail,
      replyTo: data.consultantEmail,
      subject: `Quotation from ${data.consultantName} - ${data.quotationName}`,
      html: getClientQuotationEmailHtml(data),
      tags: [
        { name: 'type', value: 'quotation_shared' },
        { name: 'quotation_id', value: data.quotationId },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.consultantEmail) }
      ]
    });

    console.log(`✅ Client quotation email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'quotation_shared',
      recipient: data.clientEmail,
      status: 'SENT',
      quotationId: data.quotationId
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send quotation email to client:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'quotation_shared',
      recipient: data.clientEmail,
      status: 'FAILED',
      quotationId: data.quotationId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send confirmation email to consultant using Resend API
 */
export const sendQuotationConfirmationToConsultant = async (data: QuotationEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending quotation confirmation to consultant: ${data.consultantEmail}`);
    console.log(`📧 Using FROM email: ${resendConfig.from}`);
    console.log(`📧 Using REPLY-TO email: ${resendConfig.replyTo}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.consultantEmail,
      replyTo: resendConfig.replyTo,
      subject: `Quotation Sent Successfully - ${data.quotationName}`,
      html: getConsultantConfirmationEmailHtml(data),
      tags: [
        { name: 'type', value: 'quotation_confirmation' },
        { name: 'quotation_id', value: data.quotationId },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.consultantEmail) }
      ]
    });

    console.log(`✅ Consultant confirmation email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'quotation_confirmation',
      recipient: data.consultantEmail,
      status: 'SENT',
      quotationId: data.quotationId
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send confirmation email to consultant:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'quotation_confirmation',
      recipient: data.consultantEmail,
      status: 'FAILED',
      quotationId: data.quotationId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send both quotation and confirmation emails
 */
export const sendQuotationEmails = async (data: QuotationEmailData): Promise<{
  client: EmailResponse;
  consultant: EmailResponse;
}> => {
  console.log(`📧 Sending quotation emails for: ${data.quotationName}`);

  // Send both emails in parallel
  const [clientResult, consultantResult] = await Promise.allSettled([
    sendQuotationToClient(data),
    sendQuotationConfirmationToConsultant(data)
  ]);

  return {
    client: clientResult.status === 'fulfilled' ? clientResult.value : { success: false, error: 'Failed to send client email' },
    consultant: consultantResult.status === 'fulfilled' ? consultantResult.value : { success: false, error: 'Failed to send consultant email' }
  };
};

/**
 * Log email to database for tracking
 */
const logEmailToDatabase = async (logData: {
  emailId: string;
  type: string;
  recipient: string;
  status: string;
  quotationId?: string;
  sessionId?: string;
  consultantId?: string;
  errorMessage?: string;
}): Promise<void> => {
  try {
    const prisma = getPrismaClient();

    // Generate subject based on email type
    const getSubjectByType = (type: string): string => {
      switch (type) {
        case 'quotation_shared': return 'Quotation shared with client';
        case 'quotation_confirmation': return 'Quotation sent confirmation';
        case 'consultant_welcome': return 'Welcome to nakksha';
        case 'password_reset': return 'Password reset request';
        case 'session_confirmation': return 'Session confirmation';
        case 'admin_notification': return 'New consultant registration';
        default: return `Email - ${type}`;
      }
    };

    await prisma.emailLog.create({
      data: {
        to: logData.recipient,
        recipientEmail: logData.recipient,
        subject: getSubjectByType(logData.type),
        emailType: logData.type,
        status: logData.status as any,
        errorMessage: logData.errorMessage,
        sentAt: logData.status === 'SENT' ? new Date() : undefined
      }
    });

    console.log(`📧 Email log saved: ${logData.type} to ${logData.recipient} - ${logData.status}`);

  } catch (error) {
    console.error('❌ Failed to log email to database:', error);
    // Don't throw error - logging should not break email sending
  }
};

/**
 * Validate Resend configuration
 */
export const validateResendConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY environment variable is required');
  }

  if (!resendConfig.from) {
    errors.push('EMAIL_FROM environment variable is required');
  }

  if (!resendConfig.replyTo) {
    errors.push('EMAIL_REPLY_TO environment variable is required');
  }

  // Test Resend client initialization
  try {
    getResendClient();
  } catch (error) {
    errors.push(`Failed to initialize Resend client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Log Resend configuration status on startup
 */
export const logResendConfigStatus = (): void => {
  const validation = validateResendConfig();
  
  if (validation.valid) {
    console.log('✅ Resend email service configured successfully');
    console.log(`📧 FROM email: ${resendConfig.from}`);
    console.log(`📧 REPLY-TO email: ${resendConfig.replyTo}`);
    console.log(`🌐 Frontend URL: ${resendConfig.baseUrl}`);
  } else {
    console.error('❌ Resend email service configuration errors:');
    validation.errors.forEach(error => console.error(`   • ${error}`));
  }
};

/**
 * Authentication Email Functions
 */

/**
 * Send welcome email to new consultant using Resend API
 */
export const sendConsultantWelcomeEmail = async (data: AuthEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending welcome email to consultant: ${data.email}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.email,
      replyTo: resendConfig.replyTo,
      subject: 'Welcome to nakksha - Verify Your Email',
      html: getConsultantWelcomeEmailHtml(data),
      tags: [
        { name: 'type', value: 'consultant_welcome' },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.email) }
      ]
    });

    console.log(`✅ Welcome email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'consultant_welcome',
      recipient: data.email,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'consultant_welcome',
      recipient: data.email,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send password reset email using Resend API
 */
export const sendPasswordResetEmail = async (data: AuthEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending password reset email to: ${data.email}`);
    
    // Validate configuration before sending
    const configValidation = validateResendConfig();
    if (!configValidation.valid) {
      console.error('❌ Resend configuration validation failed:', configValidation.errors);
      throw new Error(`Email configuration error: ${configValidation.errors.join(', ')}`);
    }
    
    console.log('✅ Resend configuration validated successfully');
    console.log('📧 Email configuration:', {
      from: resendConfig.from,
      replyTo: resendConfig.replyTo,
      hasApiKey: !!process.env.RESEND_API_KEY,
      resetLink: data.resetLink?.substring(0, 50) + '...'
    });

    const emailData = {
      from: resendConfig.from,
      to: data.email,
      replyTo: resendConfig.replyTo,
      subject: 'Reset Your Password - nakksha',
      html: getPasswordResetEmailHtml(data),
      tags: [
        { name: 'type', value: 'password_reset' },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.email) }
      ]
    };
    
    console.log('📧 Preparing to send email with data:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      tagsCount: emailData.tags.length
    });

    const emailResponse = await getResendClient().emails.send(emailData);

    console.log(`✅ Password reset email sent successfully. Email ID: ${emailResponse.data?.id}`);
    console.log('📧 Resend API response:', {
      id: emailResponse.data?.id
    });

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'password_reset',
      recipient: data.email,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send password reset email - detailed error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      timestamp: new Date().toISOString(),
      recipient: data.email,
      resetLink: data.resetLink ? 'provided' : 'missing'
    });

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'password_reset',
      recipient: data.email,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send session confirmation email using Resend API
 */
export const sendSessionConfirmationEmail = async (data: SessionEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending session confirmation email to client: ${data.clientEmail}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.clientEmail,
      replyTo: data.consultantEmail,
      subject: `Session Confirmed with ${data.consultantName}`,
      html: getSessionConfirmationEmailHtml(data),
      tags: [
        { name: 'type', value: 'session_confirmation' },
        { name: 'session_id', value: data.sessionId },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.consultantEmail) }
      ]
    });

    console.log(`✅ Session confirmation email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'session_confirmation',
      recipient: data.clientEmail,
      status: 'SENT',
      sessionId: data.sessionId
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send session confirmation email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'session_confirmation',
      recipient: data.clientEmail,
      status: 'FAILED',
      sessionId: data.sessionId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send admin notification email using Resend API
 */
export const sendAdminNotificationEmail = async (data: AdminEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending admin notification email for consultant: ${data.consultantEmail}`);

    // Get admin email from environment or use default
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nakksha.in';

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: adminEmail,
      replyTo: resendConfig.replyTo,
      subject: 'New Consultant Registration - Approval Required',
      html: getAdminNotificationEmailHtml(data),
      tags: [
        { name: 'type', value: 'admin_notification' },
        { name: 'consultant_id', value: data.consultantId },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.consultantEmail) }
      ]
    });

    console.log(`✅ Admin notification email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'admin_notification',
      recipient: adminEmail,
      status: 'SENT',
      consultantId: data.consultantId
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'admin_notification',
      recipient: process.env.ADMIN_EMAIL || 'admin@nakksha.in',
      status: 'FAILED',
      consultantId: data.consultantId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send consultant approval email
 * @param data - Consultant approval data
 * @returns Promise<EmailResponse>
 */
export const sendConsultantApprovedEmail = async (data: AuthEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending consultant approval email to: ${data.email}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.email,
      replyTo: resendConfig.replyTo,
      subject: 'Welcome to nakksha.in - Account Approved! 🎉',
      html: getConsultantApprovedEmailHtml(data),
      tags: [
        { name: 'type', value: 'consultant_approved' },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.email) }
      ]
    });

    console.log(`✅ Consultant approval email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'consultant_approved',
      recipient: data.email,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send consultant approval email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'consultant_approved',
      recipient: data.email,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send consultant rejection email
 * @param data - Consultant rejection data
 * @returns Promise<EmailResponse>
 */
export const sendConsultantRejectedEmail = async (data: AuthEmailData & { 
  reason?: string; 
  supportEmail?: string; 
}): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending consultant rejection email to: ${data.email}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.email,
      replyTo: resendConfig.replyTo,
      subject: 'Update on Your nakksha.in Application',
      html: getConsultantRejectedEmailHtml(data),
      tags: [
        { name: 'type', value: 'consultant_rejected' },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.email) }
      ]
    });

    console.log(`✅ Consultant rejection email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'consultant_rejected',
      recipient: data.email,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send consultant rejection email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'consultant_rejected',
      recipient: data.email,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send client welcome email
 * @param data - Client welcome data
 * @returns Promise<EmailResponse>
 */
export const sendClientWelcomeEmail = async (data: ClientEmailData): Promise<EmailResponse> => {
  try {
    console.log(`📧 Sending client welcome email to: ${data.clientEmail}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: data.clientEmail,
      replyTo: resendConfig.replyTo,
      subject: 'Welcome to nakksha.in - You\'re All Set! 🎉',
      html: getClientWelcomeEmailHtml(data),
      tags: [
        { name: 'type', value: 'client_welcome' },
        { name: 'client_email', value: sanitizeEmailForTag(data.clientEmail) },
        { name: 'consultant_email', value: sanitizeEmailForTag(data.consultantEmail) }
      ]
    });

    console.log(`✅ Client welcome email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'client_welcome',
      recipient: data.clientEmail,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send client welcome email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'client_welcome',
      recipient: data.clientEmail,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send payment confirmation email
 * @param data - Payment confirmation data
 * @returns Promise<EmailResponse>
 */
export const sendPaymentConfirmationEmail = async (data: PaymentEmailData): Promise<EmailResponse> => {
  try {
    const recipient = data.clientEmail || data.consultantEmail;
    if (!recipient) {
      throw new Error('No recipient email provided');
    }

    console.log(`📧 Sending payment confirmation email to: ${recipient}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: recipient,
      replyTo: resendConfig.replyTo,
      subject: 'Payment Confirmed - Thank You! ✅',
      html: getPaymentConfirmationEmailHtml(data),
      tags: [
        { name: 'type', value: 'payment_confirmation' },
        { name: 'recipient', value: sanitizeEmailForTag(recipient) },
        { name: 'transaction_id', value: data.transactionId || '' }
      ]
    });

    console.log(`✅ Payment confirmation email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'payment_confirmation',
      recipient: recipient,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send payment confirmation email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'payment_confirmation',
      recipient: data.clientEmail || data.consultantEmail || '',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

/**
 * Send refund notification email
 * @param data - Refund notification data
 * @returns Promise<EmailResponse>
 */
export const sendRefundNotificationEmail = async (data: PaymentEmailData): Promise<EmailResponse> => {
  try {
    const recipient = data.clientEmail || data.consultantEmail;
    if (!recipient) {
      throw new Error('No recipient email provided');
    }

    console.log(`📧 Sending refund notification email to: ${recipient}`);

    const emailResponse = await getResendClient().emails.send({
      from: resendConfig.from,
      to: recipient,
      replyTo: resendConfig.replyTo,
      subject: 'Refund Processed - Confirmation 💰',
      html: getRefundNotificationEmailHtml(data),
      tags: [
        { name: 'type', value: 'refund_notification' },
        { name: 'recipient', value: sanitizeEmailForTag(recipient) },
        { name: 'transaction_id', value: data.transactionId || '' }
      ]
    });

    console.log(`✅ Refund notification email sent successfully. Email ID: ${emailResponse.data?.id}`);

    // Log to database
    await logEmailToDatabase({
      emailId: emailResponse.data?.id || '',
      type: 'refund_notification',
      recipient: recipient,
      status: 'SENT'
    });

    return {
      success: true,
      emailId: emailResponse.data?.id,
      details: emailResponse.data
    };

  } catch (error) {
    console.error('❌ Failed to send refund notification email:', error);

    // Log failed email to database
    await logEmailToDatabase({
      emailId: '',
      type: 'refund_notification',
      recipient: data.clientEmail || data.consultantEmail || '',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};

export default {
  // Quotation emails (existing)
  sendQuotationToClient,
  sendQuotationConfirmationToConsultant,
  sendQuotationEmails,
  
  // Authentication emails (new)
  sendConsultantWelcomeEmail,
  sendPasswordResetEmail,
  sendConsultantApprovedEmail,
  sendConsultantRejectedEmail,
  
  // Session emails (new)
  sendSessionConfirmationEmail,
  
  // Admin emails (new)
  sendAdminNotificationEmail,
  
  // Client emails (new)
  sendClientWelcomeEmail,
  
  // Payment emails (new)
  sendPaymentConfirmationEmail,
  sendRefundNotificationEmail,
  
  // Utility functions
  validateResendConfig,
  logResendConfigStatus
};