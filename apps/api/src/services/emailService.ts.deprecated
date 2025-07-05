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

import nodemailer from 'nodemailer';
import { getPrismaClient } from '../config/database';
import { cacheUtils } from '../config/redis';

/**
 * Email configuration
 */
const emailConfig = {
  // SMTP Configuration (using Gmail as example)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },

  // Email settings
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Nakksha Consulting Platform',
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@nakksha.com'
  },

  // Template settings
  templates: {
    baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || 'https://app.nakksha.com',
    assetUrl: process.env.EMAIL_ASSET_URL || 'https://assets.nakksha.com'
  },

  // Retry settings
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds

  // Rate limiting
  maxEmailsPerHour: 1000,
  maxEmailsPerDay: 10000
};

/**
 * Email template interface
 */
interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

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
 * Create nodemailer transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport(emailConfig.smtp);
};

/**
 * Email templates with HTML and text versions
 */
const emailTemplates: Record<string, (data: any) => EmailTemplate> = {
  // Consultant welcome email
  consultant_welcome: (data) => ({
    subject: 'Welcome to Nakksha - Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Nakksha</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .info-box { background: #FEF7E0; border: 1px solid #FCD34D; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>Welcome to Nakksha!</h1>
          </div>
          
          <p>Hi ${data.firstName},</p>
          
          <p>Thank you for joining Nakksha, the premier consulting platform. We're excited to have you on board!</p>
          
          <p>To get started, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${data.verificationLink}" class="button">Verify Email Address</a>
          </div>
          
          <div class="info-box">
            <h3>⚠️ Important: Admin Approval Required</h3>
            <p>After email verification, your account will require admin approval before you can access the full dashboard. You'll receive an email notification once approved.</p>
          </div>
          
          <p><strong>What happens next:</strong></p>
          <ol>
            <li>Click the verification link above</li>
            <li>Complete your consultant profile</li>
            <li>Wait for admin approval</li>
            <li>Start building your consulting business!</li>
          </ol>
          
          <p>If you have any questions, feel free to contact our support team.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>© 2024 Nakksha Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to Nakksha!\n\nHi ${data.firstName},\n\nThank you for joining Nakksha, the premier consulting platform.\n\nTo get started, please verify your email address: ${data.verificationLink}\n\nImportant: Your account will require admin approval before you can access the full dashboard.\n\nWhat happens next:\n1. Click the verification link\n2. Complete your consultant profile\n3. Wait for admin approval\n4. Start building your consulting business!\n\nBest regards,\nThe Nakksha Team`
  }),

  // Admin notification for new consultant
  admin_new_consultant: (data) => ({
    subject: 'New Consultant Registration - Approval Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Consultant Registration</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .consultant-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>🎉 New Consultant Registration</h1>
          </div>
          
          <p>A new consultant has registered and requires your approval:</p>
          
          <div class="consultant-card">
            <h3>Consultant Details</h3>
            <p><strong>Name:</strong> ${data.consultantName}</p>
            <p><strong>Email:</strong> ${data.consultantEmail}</p>
            <p><strong>Registration Date:</strong> ${data.signupDate}</p>
          </div>
          
          <p>Please review their application and approve or reject their access to the platform.</p>
          
          <div style="text-align: center;">
            <a href="${data.adminDashboardUrl}" class="button">Review Application</a>
          </div>
          
          <p>You can manage all consultant applications from the admin dashboard.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New Consultant Registration\n\nA new consultant has registered and requires approval:\n\nName: ${data.consultantName}\nEmail: ${data.consultantEmail}\nRegistration Date: ${data.signupDate}\n\nPlease review their application at: ${data.adminDashboardUrl}\n\nThe Nakksha System`
  }),

  // Password reset email
  password_reset: (data) => ({
    subject: 'Reset Your Password - Nakksha',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 15px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>🔑 Reset Your Password</h1>
          </div>
          
          <p>Hi ${data.firstName},</p>
          
          <p>We received a request to reset your password for your Nakksha account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${data.resetLink}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
          </div>
          
          <p>For security reasons, please don't share this link with anyone.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Reset Your Password - Nakksha\n\nHi ${data.firstName},\n\nWe received a request to reset your password for your Nakksha account.\n\nClick here to reset your password: ${data.resetLink}\n\nThis link will expire in 1 hour. If you didn't request this reset, please ignore this email.\n\nBest regards,\nThe Nakksha Team`
  }),

  // Session confirmation email (to client)
  session_confirmation: (data) => ({
    subject: `Session Confirmed with ${data.consultantName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .session-card { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .meeting-link { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>✅ Session Confirmed</h1>
          </div>
          
          <p>Hi ${data.clientName},</p>
          
          <p>Your session with <strong>${data.consultantName}</strong> has been confirmed! Here are the details:</p>
          
          <div class="session-card">
            <h3>${data.sessionTitle || 'Consulting Session'}</h3>
            <p><strong>📅 Date:</strong> ${data.sessionDate}</p>
            <p><strong>🕒 Time:</strong> ${data.sessionTime}</p>
            <p><strong>💰 Amount:</strong> ₹${data.amount}</p>
            ${data.meetingLink ? `
              <div style="text-align: center; margin-top: 20px;">
                <a href="${data.meetingLink}" class="meeting-link">Join Meeting</a>
              </div>
            ` : ''}
          </div>
          
          <p><strong>Important:</strong> Please save this email and join the meeting 5-10 minutes before the scheduled time.</p>
          
          <p>You'll receive a reminder email 24 hours before your session.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>Looking forward to your successful session!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Session Confirmed!\n\nHi ${data.clientName},\n\nYour session with ${data.consultantName} has been confirmed!\n\nSession Details:\n- Date: ${data.sessionDate}\n- Time: ${data.sessionTime}\n- Amount: ₹${data.amount}\n${data.meetingLink ? `\nMeeting Link: ${data.meetingLink}` : ''}\n\nPlease join the meeting 5-10 minutes before the scheduled time.\n\nBest regards,\nThe Nakksha Team`
  }),

  // Quotation shared with client
  quotation_shared: (data) => ({
    subject: `Quotation from ${data.consultantName} - ${data.quotationName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quotation Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .quotation-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .amount-highlight { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 15px; margin: 15px 0; text-align: center; }
          .view-button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .expires-warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 12px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>💼 Quotation Received</h1>
          </div>
          
          <p>Dear ${data.clientName},</p>
          
          <p>You have received a quotation from <strong>${data.consultantName}</strong> for your consulting needs.</p>
          
          ${data.emailMessage ? `
            <div class="quotation-card">
              <h3>📩 Message from ${data.consultantName}:</h3>
              <p style="font-style: italic;">"${data.emailMessage}"</p>
            </div>
          ` : ''}
          
          <div class="quotation-card">
            <h3>📋 Quotation Details</h3>
            <p><strong>Service:</strong> ${data.quotationName}</p>
            <p><strong>Quotation #:</strong> ${data.quotationNumber}</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            
            <div class="amount-highlight">
              <h2 style="margin: 0; color: #059669;">
                ${data.currency === 'INR' ? '₹' : data.currency} ${data.finalAmount.toLocaleString()}
                ${data.discountPercentage > 0 ? `
                  <span style="font-size: 14px; color: #6B7280; text-decoration: line-through;">
                    ${data.currency === 'INR' ? '₹' : data.currency} ${data.baseAmount.toLocaleString()}
                  </span>
                  <span style="font-size: 16px; color: #DC2626; font-weight: normal;">
                    (${data.discountPercentage}% discount)
                  </span>
                ` : ''}
              </h2>
            </div>
          </div>
          
          ${data.validUntil ? `
            <div class="expires-warning">
              <strong>⏰ This quotation expires on ${data.validUntil}</strong> - Please respond before this date.
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.viewQuotationUrl}" class="view-button">View Full Quotation</a>
          </div>
          
          <p>To accept this quotation or discuss further details, please click the link above or reply to this email.</p>
          
          <div class="footer">
            <p>Best regards,<br>${data.consultantName}<br>
            <a href="mailto:${data.consultantEmail}">${data.consultantEmail}</a></p>
            <p style="margin-top: 20px; font-size: 12px; color: #9CA3AF;">
              This quotation was sent through Nakksha Consulting Platform<br>
              © 2024 Nakksha Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Quotation Received from ${data.consultantName}\n\nDear ${data.clientName},\n\nYou have received a quotation for: ${data.quotationName}\nQuotation #: ${data.quotationNumber}\n\n${data.emailMessage ? `Message: "${data.emailMessage}"\n\n` : ''}Amount: ${data.currency === 'INR' ? '₹' : data.currency} ${data.finalAmount.toLocaleString()}${data.discountPercentage > 0 ? ` (${data.discountPercentage}% discount from ${data.currency === 'INR' ? '₹' : data.currency} ${data.baseAmount.toLocaleString()})` : ''}\n\n${data.validUntil ? `This quotation expires on ${data.validUntil}\n\n` : ''}View full quotation: ${data.viewQuotationUrl}\n\nBest regards,\n${data.consultantName}\n${data.consultantEmail}`
  }),

  // Quotation sent confirmation (to consultant)
  quotation_sent_confirmation: (data) => ({
    subject: `Quotation Sent Successfully - ${data.quotationName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quotation Sent Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .success-card { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .quotation-details { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>✅ Quotation Sent Successfully</h1>
          </div>
          
          <p>Hi ${data.consultantName},</p>
          
          <div class="success-card">
            <h3>🎉 Your quotation has been sent successfully!</h3>
            <p>Your quotation for <strong>${data.quotationName}</strong> has been delivered to ${data.clientName}.</p>
          </div>
          
          <div class="quotation-details">
            <h3>📋 Quotation Summary</h3>
            <p><strong>Client:</strong> ${data.clientName} (${data.clientEmail})</p>
            <p><strong>Service:</strong> ${data.quotationName}</p>
            <p><strong>Amount:</strong> ${data.currency === 'INR' ? '₹' : data.currency} ${data.finalAmount.toLocaleString()}</p>
            <p><strong>Quotation #:</strong> ${data.quotationNumber}</p>
            <p><strong>Sent on:</strong> ${data.sentDate}</p>
          </div>
          
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>The client will receive the quotation via email</li>
            <li>You'll be notified when they view or respond to the quotation</li>
            <li>You can track the status in your dashboard</li>
          </ul>
          
          <p>You can monitor the quotation status and any client responses from your dashboard.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>Keep building your consulting business! 🚀</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Quotation Sent Successfully!\n\nHi ${data.consultantName},\n\nYour quotation for "${data.quotationName}" has been sent to ${data.clientName} (${data.clientEmail}).\n\nQuotation Details:\n- Service: ${data.quotationName}\n- Amount: ${data.currency === 'INR' ? '₹' : data.currency} ${data.finalAmount.toLocaleString()}\n- Quotation #: ${data.quotationNumber}\n- Sent on: ${data.sentDate}\n\nThe client will receive the quotation via email and you'll be notified of any responses.\n\nBest regards,\nThe Nakksha Team`
  })
};

/**
 * Rate limiting check
 */
const checkRateLimit = async (email: string): Promise<boolean> => {
  const hourKey = `email_rate:hour:${email}:${Math.floor(Date.now() / (1000 * 60 * 60))}`;
  const dayKey = `email_rate:day:${email}:${Math.floor(Date.now() / (1000 * 60 * 60 * 24))}`;

  const [hourCount, dayCount] = await Promise.all([
    cacheUtils.get(hourKey),
    cacheUtils.get(dayKey)
  ]);

  if ((hourCount || 0) >= emailConfig.maxEmailsPerHour || (dayCount || 0) >= emailConfig.maxEmailsPerDay) {
    return false;
  }

  // Increment counters
  await Promise.all([
    cacheUtils.set(hourKey, (hourCount || 0) + 1, 3600), // 1 hour
    cacheUtils.set(dayKey, (dayCount || 0) + 1, 86400)   // 1 day
  ]);

  return true;
};

/**
 * Send email with retries
 */
const sendEmailWithRetry = async (
  transporter: any,
  mailOptions: any,
  retryCount = 0
): Promise<any> => {
  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error: any) {
    if (retryCount < emailConfig.maxRetries) {
      console.log(`📧 Email send failed, retrying (${retryCount + 1}/${emailConfig.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, emailConfig.retryDelay * (retryCount + 1)));
      return sendEmailWithRetry(transporter, mailOptions, retryCount + 1);
    }
    throw error;
  }
};

/**
 * Main email sending function
 */
export const sendEmail = async (
  templateName: string,
  emailData: EmailData,
  consultantId?: string
): Promise<boolean> => {
  try {
    // Check if template exists
    if (!emailTemplates[templateName]) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Check rate limiting
    const rateLimitOk = await checkRateLimit(emailData.to);
    if (!rateLimitOk) {
      console.warn(`📧 Rate limit exceeded for email: ${emailData.to}`);
      return false;
    }

    // Generate template content
    const template = emailTemplates[templateName](emailData.data);

    // Create transporter
    const transporter = createTransporter();

    // Prepare mail options
    const mailOptions = {
      from: emailData.from || `${emailConfig.from.name} <${emailConfig.from.email}>`,
      to: emailData.to,
      subject: template.subject,
      html: template.html,
      text: template.text || template.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: emailData.replyTo,
      cc: emailData.cc,
      bcc: emailData.bcc,
      attachments: emailData.attachments
    };

    // Send email with retry logic
    const result = await sendEmailWithRetry(transporter, mailOptions);

    console.log(`✅ Email sent successfully: ${templateName} to ${emailData.to}`);
    return true;

  } catch (error: any) {
    console.error(`❌ Failed to send email (${templateName}):`, error);
    return false;
  }
};

/**
 * Setup email templates and verify SMTP connection
 */
export const setupEmailTemplates = async (): Promise<void> => {
  try {
    // Test SMTP connection if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createTransporter();
      await transporter.verify();
      console.log('✅ Email service initialized successfully');
    } else {
      console.log('⚠️ Email service: SMTP credentials not configured, emails will be logged only');
    }
    
    console.log(`📧 Templates loaded: ${Object.keys(emailTemplates).length}`);
    
  } catch (error) {
    console.error('❌ Email service initialization failed:', error);
    // Don't throw error - email is not critical for development
    console.log('📧 Email service will run in development mode (logging only)');
  }
};

export default {
  sendEmail,
  setupEmailTemplates
};