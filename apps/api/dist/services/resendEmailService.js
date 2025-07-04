"use strict";
/**
 * Resend Email Service for Quotation Management
 *
 * This service handles quotation email sending using the Resend API.
 * It provides professional email templates and reliable delivery for:
 * - Client quotation sharing
 * - Consultant confirmation emails
 * - Quotation status updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResendConfig = exports.sendQuotationEmails = exports.sendQuotationConfirmationToConsultant = exports.sendQuotationToClient = void 0;
const resend_1 = require("resend");
const database_1 = require("../config/database");
// Initialize Resend client
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
/**
 * Email configuration for Resend
 */
const resendConfig = {
    from: process.env.EMAIL_FROM || 'Naksha Platform <noreply@naksha.com>',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@naksha.com',
    baseUrl: process.env.FRONTEND_URL || 'https://dashboard.naksha.com'
};
/**
 * Professional quotation email template for clients
 */
const getClientQuotationEmailHtml = (data) => {
    const { quotationName, clientName, consultantName, consultantCompany, description, baseAmount, discountPercentage, finalAmount, currency, validUntil, quotationNumber, viewQuotationUrl, emailMessage } = data;
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
                ${discountPercentage > 0 ? `
                <div class="detail-item">
                    <div class="detail-label">Discount</div>
                    <div class="detail-value">${discountPercentage}%</div>
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
                <div style="font-size: 18px; opacity: 0.9;">Total Amount</div>
                <div class="final-amount">${currency} ${finalAmount.toLocaleString()}</div>
                ${discountPercentage > 0 ? `<div style="opacity: 0.8;">You save ${currency} ${(baseAmount - finalAmount).toLocaleString()}</div>` : ''}
            </div>
            
            ${viewQuotationUrl ? `
            <div style="text-align: center;">
                <a href="${viewQuotationUrl}" class="cta-button">View Full Quotation</a>
            </div>
            ` : ''}
            
            <p>If you have any questions about this quotation or would like to discuss the project further, please don't hesitate to reach out to me.</p>
            
            <p>I look forward to working with you!</p>
            
            <p>Best regards,<br>
            <strong>${consultantName}</strong><br>
            ${consultantCompany || 'Independent Consultant'}</p>
        </div>
        
        <div class="footer">
            <p>This quotation was generated by Naksha Consulting Platform</p>
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
const getConsultantConfirmationEmailHtml = (data) => {
    const { quotationName, clientName, clientEmail, finalAmount, currency, quotationNumber, sentDate } = data;
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
            <p>This is an automated confirmation from Naksha Consulting Platform</p>
        </div>
    </div>
</body>
</html>
  `;
};
/**
 * Send quotation email to client using Resend API
 */
const sendQuotationToClient = async (data) => {
    try {
        console.log(`📧 Sending quotation email to client: ${data.clientEmail}`);
        const emailResponse = await resend.emails.send({
            from: resendConfig.from,
            to: data.clientEmail,
            replyTo: data.consultantEmail,
            subject: `Quotation from ${data.consultantName} - ${data.quotationName}`,
            html: getClientQuotationEmailHtml(data),
            tags: [
                { name: 'type', value: 'quotation_shared' },
                { name: 'quotation_id', value: data.quotationId },
                { name: 'consultant_email', value: data.consultantEmail }
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
    }
    catch (error) {
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
exports.sendQuotationToClient = sendQuotationToClient;
/**
 * Send confirmation email to consultant using Resend API
 */
const sendQuotationConfirmationToConsultant = async (data) => {
    try {
        console.log(`📧 Sending quotation confirmation to consultant: ${data.consultantEmail}`);
        const emailResponse = await resend.emails.send({
            from: resendConfig.from,
            to: data.consultantEmail,
            replyTo: resendConfig.replyTo,
            subject: `Quotation Sent Successfully - ${data.quotationName}`,
            html: getConsultantConfirmationEmailHtml(data),
            tags: [
                { name: 'type', value: 'quotation_confirmation' },
                { name: 'quotation_id', value: data.quotationId },
                { name: 'consultant_email', value: data.consultantEmail }
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
    }
    catch (error) {
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
exports.sendQuotationConfirmationToConsultant = sendQuotationConfirmationToConsultant;
/**
 * Send both quotation and confirmation emails
 */
const sendQuotationEmails = async (data) => {
    console.log(`📧 Sending quotation emails for: ${data.quotationName}`);
    // Send both emails in parallel
    const [clientResult, consultantResult] = await Promise.allSettled([
        (0, exports.sendQuotationToClient)(data),
        (0, exports.sendQuotationConfirmationToConsultant)(data)
    ]);
    return {
        client: clientResult.status === 'fulfilled' ? clientResult.value : { success: false, error: 'Failed to send client email' },
        consultant: consultantResult.status === 'fulfilled' ? consultantResult.value : { success: false, error: 'Failed to send consultant email' }
    };
};
exports.sendQuotationEmails = sendQuotationEmails;
/**
 * Log email to database for tracking
 */
const logEmailToDatabase = async (logData) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        await prisma.emailLog.create({
            data: {
                to: logData.recipient,
                recipientEmail: logData.recipient,
                subject: `Quotation - ${logData.type}`,
                emailType: logData.type,
                status: logData.status,
                errorMessage: logData.errorMessage,
                sentAt: logData.status === 'SENT' ? new Date() : undefined
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to log email to database:', error);
    }
};
/**
 * Validate Resend configuration
 */
const validateResendConfig = () => {
    const errors = [];
    if (!process.env.RESEND_API_KEY) {
        errors.push('RESEND_API_KEY environment variable is required');
    }
    if (!resendConfig.from) {
        errors.push('EMAIL_FROM environment variable is required');
    }
    return {
        valid: errors.length === 0,
        errors
    };
};
exports.validateResendConfig = validateResendConfig;
exports.default = {
    sendQuotationToClient: exports.sendQuotationToClient,
    sendQuotationConfirmationToConsultant: exports.sendQuotationConfirmationToConsultant,
    sendQuotationEmails: exports.sendQuotationEmails,
    validateResendConfig: exports.validateResendConfig
};
//# sourceMappingURL=resendEmailService.js.map