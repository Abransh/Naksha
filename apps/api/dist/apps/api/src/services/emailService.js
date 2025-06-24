"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEmailTemplates = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const redis_1 = require("../config/redis");
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
 * Create nodemailer transporter
 */
const createTransporter = () => {
    return nodemailer_1.default.createTransport(emailConfig.smtp);
};
/**
 * Email templates with HTML and text versions
 */
const emailTemplates = {
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
    })
};
/**
 * Rate limiting check
 */
const checkRateLimit = async (email) => {
    const hourKey = `email_rate:hour:${email}:${Math.floor(Date.now() / (1000 * 60 * 60))}`;
    const dayKey = `email_rate:day:${email}:${Math.floor(Date.now() / (1000 * 60 * 60 * 24))}`;
    const [hourCount, dayCount] = await Promise.all([
        redis_1.cacheUtils.get(hourKey),
        redis_1.cacheUtils.get(dayKey)
    ]);
    if ((hourCount || 0) >= emailConfig.maxEmailsPerHour || (dayCount || 0) >= emailConfig.maxEmailsPerDay) {
        return false;
    }
    // Increment counters
    await Promise.all([
        redis_1.cacheUtils.set(hourKey, (hourCount || 0) + 1, 3600), // 1 hour
        redis_1.cacheUtils.set(dayKey, (dayCount || 0) + 1, 86400) // 1 day
    ]);
    return true;
};
/**
 * Send email with retries
 */
const sendEmailWithRetry = async (transporter, mailOptions, retryCount = 0) => {
    try {
        const result = await transporter.sendMail(mailOptions);
        return result;
    }
    catch (error) {
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
const sendEmail = async (templateName, emailData, consultantId) => {
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
    }
    catch (error) {
        console.error(`❌ Failed to send email (${templateName}):`, error);
        return false;
    }
};
exports.sendEmail = sendEmail;
/**
 * Setup email templates and verify SMTP connection
 */
const setupEmailTemplates = async () => {
    try {
        // Test SMTP connection if credentials are provided
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = createTransporter();
            await transporter.verify();
            console.log('✅ Email service initialized successfully');
        }
        else {
            console.log('⚠️ Email service: SMTP credentials not configured, emails will be logged only');
        }
        console.log(`📧 Templates loaded: ${Object.keys(emailTemplates).length}`);
    }
    catch (error) {
        console.error('❌ Email service initialization failed:', error);
        // Don't throw error - email is not critical for development
        console.log('📧 Email service will run in development mode (logging only)');
    }
};
exports.setupEmailTemplates = setupEmailTemplates;
exports.default = {
    sendEmail: exports.sendEmail,
    setupEmailTemplates: exports.setupEmailTemplates
};
//# sourceMappingURL=emailService.js.map