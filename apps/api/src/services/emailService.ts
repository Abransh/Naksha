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
  return nodemailer.createTransporter(emailConfig.smtp);
};

/**
 * Email templates with HTML and text versions
 */
const emailTemplates: Record<string, (data: any) => EmailTemplate> = {
  // User verification email
  email_verification: (data) => ({
    subject: 'Verify your Nakksha account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>Verify your account</h1>
          </div>
          
          <p>Hi ${data.firstName},</p>
          
          <p>Thank you for signing up for Nakksha! Please click the button below to verify your email address and activate your account.</p>
          
          <div style="text-align: center;">
            <a href="${data.verificationLink}" class="button">Verify Email Address</a>
          </div>
          
          <p>If you can't click the button, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${data.verificationLink}</p>
          
          <p>If you didn't create an account with Nakksha, you can safely ignore this email.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.firstName},\n\nThank you for signing up for Nakksha! Please visit the following link to verify your email address:\n\n${data.verificationLink}\n\nIf you didn't create an account with Nakksha, you can safely ignore this email.\n\nBest regards,\nThe Nakksha Team`
  }),

  // Password reset email
  password_reset: (data) => ({
    subject: 'Reset your Nakksha password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .warning { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>Reset your password</h1>
          </div>
          
          <p>Hi ${data.firstName},</p>
          
          <p>We received a request to reset your password for your Nakksha account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${data.resetLink}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This password reset link will expire in 30 minutes. If you didn't request this reset, please ignore this email and your password will remain unchanged.
          </div>
          
          <p>If you can't click the button, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #EF4444;">${data.resetLink}</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.firstName},\n\nWe received a request to reset your password for your Nakksha account. Visit the following link to create a new password:\n\n${data.resetLink}\n\nThis link will expire in 30 minutes. If you didn't request this reset, please ignore this email.\n\nBest regards,\nThe Nakksha Team`
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
          .session-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .session-detail { margin: 10px 0; display: flex; justify-content: space-between; }
          .session-detail strong { color: #1F2937; }
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
            <div class="session-detail">
              <span>📅 Date:</span>
              <strong>${data.sessionDate}</strong>
            </div>
            <div class="session-detail">
              <span>🕒 Time:</span>
              <strong>${data.sessionTime}</strong>
            </div>
            <div class="session-detail">
              <span>💻 Platform:</span>
              <strong>${data.platform}</strong>
            </div>
            <div class="session-detail">
              <span>💰 Amount:</span>
              <strong>${data.currency} ${data.amount}</strong>
            </div>
            ${data.meetingLink ? `
              <div style="text-align: center; margin-top: 20px;">
                <a href="${data.meetingLink}" class="meeting-link">Join Meeting</a>
              </div>
              ${data.meetingPassword ? `<p><strong>Meeting Password:</strong> ${data.meetingPassword}</p>` : ''}
            ` : ''}
          </div>
          
          <p><strong>Important:</strong> Please save this email and join the meeting 5-10 minutes before the scheduled time.</p>
          
          <p>If you need to reschedule or have any questions, please contact ${data.consultantName} directly.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>Looking forward to your successful session!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nYour session with ${data.consultantName} has been confirmed!\n\nSession Details:\n- Date: ${data.sessionDate}\n- Time: ${data.sessionTime}\n- Platform: ${data.platform}\n- Amount: ${data.currency} ${data.amount}\n${data.meetingLink ? `\nMeeting Link: ${data.meetingLink}` : ''}${data.meetingPassword ? `\nMeeting Password: ${data.meetingPassword}` : ''}\n\nPlease join the meeting 5-10 minutes before the scheduled time.\n\nBest regards,\nThe Nakksha Team`
  }),

  // Session booked notification (to consultant)
  session_booked: (data) => ({
    subject: `New Session Booked: ${data.clientName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Session Booked</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .session-card { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .client-info { background: #F8FAFC; border-radius: 6px; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>🎉 New Session Booked!</h1>
          </div>
          
          <p>Hi ${data.consultantName},</p>
          
          <p>Great news! You have a new session booking:</p>
          
          <div class="session-card">
            <h3>${data.sessionTitle || 'New Session'}</h3>
            <p><strong>📅 Date:</strong> ${data.sessionDate}</p>
            <p><strong>🕒 Time:</strong> ${data.sessionTime}</p>
            <p><strong>💰 Amount:</strong> ${data.currency} ${data.amount}</p>
            ${data.isRepeatClient ? '<p><strong>🔄 Repeat Client</strong></p>' : '<p><strong>✨ New Client</strong></p>'}
          </div>
          
          <div class="client-info">
            <h4>👤 Client Information</h4>
            <p><strong>Name:</strong> ${data.clientName}</p>
            <p><strong>Email:</strong> ${data.clientEmail}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${emailConfig.templates.baseUrl}/dashboard/sessions" class="button">View in Dashboard</a>
          </div>
          
          <p>The client has been automatically sent confirmation details. You can view all session details in your dashboard.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Nakksha Team</p>
            <p>Keep up the great work!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.consultantName},\n\nGreat news! You have a new session booking from ${data.clientName}.\n\nSession Details:\n- Date: ${data.sessionDate}\n- Time: ${data.sessionTime}\n- Amount: ${data.currency} ${data.amount}\n- Client: ${data.clientName} (${data.clientEmail})\n\nView details: ${emailConfig.templates.baseUrl}/dashboard/sessions\n\nBest regards,\nThe Nakksha Team`
  }),

  // Quotation shared email
  quotation_shared: (data) => ({
    subject: `Quotation from ${data.consultantName}: ${data.quotationName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Quotation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .quotation-card { background: #FEF7E0; border: 1px solid #FCD34D; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #059669; text-align: center; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #F59E0B; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .expiry { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 10px; margin: 15px 0; text-align: center; color: #DC2626; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>📋 New Quotation</h1>
          </div>
          
          <p>Hi ${data.clientName},</p>
          
          <p>${data.consultantName} has prepared a quotation for you:</p>
          
          <div class="quotation-card">
            <h3>${data.quotationName}</h3>
            <div class="amount">${data.currency} ${data.finalAmount}</div>
            ${data.expiresAt ? `<div class="expiry">⏰ Valid until: ${data.expiresAt}</div>` : ''}
          </div>
          
          ${data.customMessage ? `<p><strong>Message from ${data.consultantName}:</strong></p><p style="font-style: italic; background: #F8FAFC; padding: 15px; border-radius: 6px;">${data.customMessage}</p>` : ''}
          
          <div style="text-align: center;">
            <a href="${data.viewLink}" class="button">View Quotation</a>
          </div>
          
          <p>Click the button above to view the complete quotation details and take action.</p>
          
          <div class="footer">
            <p>Best regards,<br>${data.consultantName}</p>
            <p>Powered by Nakksha</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\n${data.consultantName} has prepared a quotation for you:\n\n${data.quotationName}\nAmount: ${data.currency} ${data.finalAmount}\n${data.expiresAt ? `Valid until: ${data.expiresAt}\n` : ''}${data.customMessage ? `\nMessage: ${data.customMessage}\n` : ''}\nView quotation: ${data.viewLink}\n\nBest regards,\n${data.consultantName}`
  }),

  // Session reminder email
  session_reminder: (data) => ({
    subject: `Reminder: Session with ${data.consultantName} tomorrow`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .reminder-card { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .meeting-link { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>⏰ Session Reminder</h1>
          </div>
          
          <p>Hi ${data.clientName},</p>
          
          <p>This is a friendly reminder about your upcoming session with <strong>${data.consultantName}</strong>:</p>
          
          <div class="reminder-card">
            <h3>📅 Tomorrow's Session</h3>
            <p><strong>Date:</strong> ${data.sessionDate}</p>
            <p><strong>Time:</strong> ${data.sessionTime}</p>
            <p><strong>Platform:</strong> ${data.platform}</p>
            
            ${data.meetingLink ? `
              <div style="text-align: center; margin-top: 20px;">
                <a href="${data.meetingLink}" class="meeting-link">Join Meeting</a>
              </div>
            ` : ''}
          </div>
          
          <p><strong>Preparation tips:</strong></p>
          <ul>
            <li>Test your internet connection and audio/video setup</li>
            <li>Prepare any questions or materials you want to discuss</li>
            <li>Join the meeting 5-10 minutes early</li>
            <li>Ensure you're in a quiet, well-lit environment</li>
          </ul>
          
          <p>Looking forward to a productive session!</p>
          
          <div class="footer">
            <p>Best regards,<br>${data.consultantName}</p>
            <p>Powered by Nakksha</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nThis is a reminder about your session with ${data.consultantName} tomorrow:\n\nDate: ${data.sessionDate}\nTime: ${data.sessionTime}\nPlatform: ${data.platform}\n${data.meetingLink ? `Meeting Link: ${data.meetingLink}\n` : ''}\nPlease join 5-10 minutes early and ensure you have a stable internet connection.\n\nBest regards,\n${data.consultantName}`
  }),

  // Welcome email for new clients
  client_welcome: (data) => ({
    subject: `Welcome to ${data.consultantName}'s consulting services`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #4F46E5; font-size: 24px; font-weight: bold; }
          .welcome-card { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nakksha</div>
            <h1>🎉 Welcome!</h1>
          </div>
          
          <div class="welcome-card">
            <h2>Welcome to ${data.consultantName}'s network!</h2>
            <p>You've been added as a valued client and can now book sessions directly.</p>
          </div>
          
          <p>Hi ${data.clientName},</p>
          
          <p>Welcome! You're now connected with <strong>${data.consultantName}</strong> through the Nakksha platform.</p>
          
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>Book consultation sessions</li>
            <li>Receive and respond to quotations</li>
            <li>Communicate directly with ${data.consultantName}</li>
            <li>Track your session history</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${data.profileUrl}" class="button">View ${data.consultantName}'s Profile</a>
          </div>
          
          <p>If you have any questions, feel free to reach out to ${data.consultantName} directly at ${data.consultantEmail}.</p>
          
          <div class="footer">
            <p>Best regards,<br>${data.consultantName}</p>
            <p>Powered by Nakksha</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${data.clientName},\n\nWelcome to ${data.consultantName}'s consulting network!\n\nYou can now:\n- Book consultation sessions\n- Receive quotations\n- Communicate directly\n- Track session history\n\nView profile: ${data.profileUrl}\n\nQuestions? Contact ${data.consultantName} at ${data.consultantEmail}\n\nBest regards,\n${data.consultantName}`
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
 * Log email attempt
 */
const logEmailAttempt = async (
  emailType: string,
  recipientEmail: string,
  status: 'QUEUED' | 'SENT' | 'FAILED',
  consultantId?: string,
  errorMessage?: string
): Promise<void> => {
  try {
    const prisma = getPrismaClient();
    
    await prisma.emailLog.create({
      data: {
        consultantId,
        recipientEmail,
        emailType,
        status,
        errorMessage,
        sentAt: status === 'SENT' ? new Date() : null
      }
    });
  } catch (error) {
    console.error('❌ Failed to log email attempt:', error);
  }
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
      await logEmailAttempt(templateName, emailData.to, 'FAILED', consultantId, 'Rate limit exceeded');
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

    // Log queued status
    await logEmailAttempt(templateName, emailData.to, 'QUEUED', consultantId);

    // Send email with retry logic
    const result = await sendEmailWithRetry(transporter, mailOptions);

    // Log success
    await logEmailAttempt(templateName, emailData.to, 'SENT', consultantId);

    console.log(`✅ Email sent successfully: ${templateName} to ${emailData.to}`);
    return true;

  } catch (error: any) {
    console.error(`❌ Failed to send email (${templateName}):`, error);

    // Log failure
    await logEmailAttempt(templateName, emailData.to, 'FAILED', consultantId, error.message);

    return false;
  }
};

/**
 * Send notification email (simplified interface)
 */
export const sendNotificationEmail = async (
  templateName: string,
  emailData: EmailData,
  consultantId?: string
): Promise<boolean> => {
  return sendEmail(templateName, emailData, consultantId);
};

/**
 * Send bulk emails (for newsletters, announcements)
 */
export const sendBulkEmails = async (
  templateName: string,
  recipients: Array<{ email: string; data: Record<string, any> }>,
  consultantId?: string
): Promise<{ sent: number; failed: number }> => {
  const results = {
    sent: 0,
    failed: 0
  };

  // Send emails in batches to avoid overwhelming the SMTP server
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (recipient) => {
      const success = await sendEmail(templateName, {
        to: recipient.email,
        data: recipient.data
      }, consultantId);
      
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
    });

    await Promise.all(batchPromises);

    // Add delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  return results;
};

/**
 * Setup email templates and verify SMTP connection
 */
export const setupEmailTemplates = async (): Promise<void> => {
  try {
    // Test SMTP connection
    const transporter = createTransporter();
    await transporter.verify();
    
    console.log('✅ Email service initialized successfully');
    console.log(`📧 Templates loaded: ${Object.keys(emailTemplates).length}`);
    
  } catch (error) {
    console.error('❌ Email service initialization failed:', error);
    throw new Error('Failed to initialize email service');
  }
};

/**
 * Get email statistics
 */
export const getEmailStats = async (consultantId?: string): Promise<any> => {
  try {
    const prisma = getPrismaClient();

    const where = consultantId ? { consultantId } : {};

    const [total, sent, failed, byType] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, status: 'SENT' } }),
      prisma.emailLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.emailLog.groupBy({
        by: ['emailType'],
        where,
        _count: true,
        orderBy: { _count: { _all: 'desc' } }
      })
    ]);

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? (sent / total) * 100 : 0,
      byType: byType.map(item => ({
        type: item.emailType,
        count: item._count
      }))
    };

  } catch (error) {
    console.error('❌ Failed to get email stats:', error);
    return null;
  }
};

/**
 * Preview email template
 */
export const previewEmailTemplate = (
  templateName: string,
  sampleData: Record<string, any>
): EmailTemplate | null => {
  if (!emailTemplates[templateName]) {
    return null;
  }

  return emailTemplates[templateName](sampleData);
};

export default {
  sendEmail,
  sendNotificationEmail,
  sendBulkEmails,
  setupEmailTemplates,
  getEmailStats,
  previewEmailTemplate
};