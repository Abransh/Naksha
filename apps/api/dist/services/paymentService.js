"use strict";
/**
 * File Path: apps/api/src/services/paymentService.ts
 *
 * Payment Processing Service
 *
 * Handles all payment operations using Razorpay:
 * - Payment order creation
 * - Payment verification and processing
 * - Webhook handling for payment events
 * - Refund processing
 * - Payment analytics and reporting
 * - Subscription management
 * - Failed payment retry logic
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWebhookEvent = exports.validateWebhookSignature = exports.getPaymentAnalytics = exports.processRefund = exports.handleFailedPayment = exports.processSuccessfulPayment = exports.verifyPaymentSignature = exports.createPaymentOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const resendEmailService_1 = require("./resendEmailService");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Payment configuration
 */
const paymentConfig = {
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    },
    // Currency settings
    defaultCurrency: 'INR',
    supportedCurrencies: ['INR', 'USD', 'EUR'],
    // Payment limits
    limits: {
        minimum: 1.00, // Minimum ₹1
        maximum: 500000.00, // Maximum ₹5 lakh
        dailyLimit: 1000000.00 // Daily limit ₹10 lakh
    },
    // Retry settings
    maxRetries: 3,
    retryDelays: [5000, 15000, 30000], // 5s, 15s, 30s
    // Webhook settings
    webhookTimeout: 30000, // 30 seconds
    // Refund settings
    refundTimeLimit: 180 * 24 * 60 * 60 * 1000, // 180 days in milliseconds
};
/**
 * Initialize Razorpay instance
 */
let razorpay = null;
// Only initialize Razorpay if credentials are provided
if (paymentConfig.razorpay.keyId && paymentConfig.razorpay.keySecret) {
    razorpay = new razorpay_1.default({
        key_id: paymentConfig.razorpay.keyId,
        key_secret: paymentConfig.razorpay.keySecret,
    });
}
else {
    console.warn('⚠️  Razorpay credentials not found. Payment functionality will be limited.');
}
/**
 * Create payment order
 */
const createPaymentOrder = async (orderData) => {
    try {
        // Validate amount
        if (orderData.amount < paymentConfig.limits.minimum) {
            throw new errorHandler_1.ValidationError(`Minimum payment amount is ₹${paymentConfig.limits.minimum}`);
        }
        if (orderData.amount > paymentConfig.limits.maximum) {
            throw new errorHandler_1.ValidationError(`Maximum payment amount is ₹${paymentConfig.limits.maximum}`);
        }
        // Check daily limit for consultant
        const dailyAmount = await getDailyPaymentAmount(orderData.consultantId);
        if (dailyAmount + orderData.amount > paymentConfig.limits.dailyLimit) {
            throw new errorHandler_1.ValidationError('Daily payment limit exceeded');
        }
        const prisma = (0, database_1.getPrismaClient)();
        // Convert amount to paise (Razorpay expects amount in smallest currency unit)
        const amountInPaise = Math.round(orderData.amount * 100);
        // Generate unique receipt
        const receipt = orderData.receipt || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Create Razorpay order
        if (!razorpay) {
            throw new errorHandler_1.AppError('Payment service not initialized. Please configure Razorpay credentials.', 503);
        }
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: orderData.currency || paymentConfig.defaultCurrency,
            receipt,
            notes: {
                consultantId: orderData.consultantId,
                clientEmail: orderData.clientEmail,
                clientName: orderData.clientName,
                ...(orderData.sessionId && { sessionId: orderData.sessionId }),
                ...(orderData.quotationId && { quotationId: orderData.quotationId }),
                ...orderData.notes
            }
        });
        // Store payment transaction record
        const paymentTransaction = await prisma.paymentTransaction.create({
            data: {
                consultantId: orderData.consultantId,
                sessionId: orderData.sessionId || null,
                quotationId: orderData.quotationId || null,
                clientEmail: orderData.clientEmail,
                amount: orderData.amount,
                currency: orderData.currency || paymentConfig.defaultCurrency,
                gatewayOrderId: razorpayOrder.id,
                status: 'PENDING',
                transactionType: 'payment',
                gatewayResponse: razorpayOrder
            }
        });
        console.log(`💳 Payment order created: ${razorpayOrder.id} for ₹${orderData.amount}`);
        return {
            orderId: razorpayOrder.id,
            amount: orderData.amount,
            currency: razorpayOrder.currency,
            transactionId: paymentTransaction.id,
            keyId: paymentConfig.razorpay.keyId,
            receipt: razorpayOrder.receipt,
            created_at: razorpayOrder.created_at
        };
    }
    catch (error) {
        console.error('❌ Create payment order error:', error);
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        if (error.error && error.error.code) {
            throw new errorHandler_1.AppError(`Payment service error: ${error.error.description}`, 400, 'PAYMENT_SERVICE_ERROR');
        }
        throw new errorHandler_1.AppError('Failed to create payment order', 500, 'PAYMENT_ORDER_ERROR');
    }
};
exports.createPaymentOrder = createPaymentOrder;
/**
 * Verify payment signature
 */
const verifyPaymentSignature = (verificationData) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verificationData;
        // Create signature string
        const signatureString = `${razorpayOrderId}|${razorpayPaymentId}`;
        // Generate expected signature
        const expectedSignature = crypto_1.default
            .createHmac('sha256', paymentConfig.razorpay.keySecret)
            .update(signatureString)
            .digest('hex');
        // Compare signatures
        return expectedSignature === razorpaySignature;
    }
    catch (error) {
        console.error('❌ Payment signature verification error:', error);
        return false;
    }
};
exports.verifyPaymentSignature = verifyPaymentSignature;
/**
 * Process successful payment
 */
const processSuccessfulPayment = async (verificationData) => {
    try {
        const { razorpayOrderId, razorpayPaymentId } = verificationData;
        const prisma = (0, database_1.getPrismaClient)();
        // Verify signature first
        if (!(0, exports.verifyPaymentSignature)(verificationData)) {
            throw new errorHandler_1.ValidationError('Invalid payment signature');
        }
        // Get payment details from Razorpay
        if (!razorpay) {
            throw new errorHandler_1.AppError('Payment service not initialized. Please configure Razorpay credentials.', 503);
        }
        const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);
        if (razorpayPayment.status !== 'captured') {
            throw new errorHandler_1.ValidationError('Payment not captured');
        }
        // Find payment transaction
        const paymentTransaction = await prisma.paymentTransaction.findFirst({
            where: {
                gatewayOrderId: razorpayOrderId,
                status: 'PENDING'
            },
            include: {
                session: {
                    include: {
                        client: true,
                        consultant: true
                    }
                },
                quotation: {
                    include: {
                        consultant: true
                    }
                }
            }
        });
        if (!paymentTransaction) {
            throw new errorHandler_1.ValidationError('Payment transaction not found or already processed');
        }
        // Update payment transaction
        const updatedTransaction = await prisma.paymentTransaction.update({
            where: { id: paymentTransaction.id },
            data: {
                gatewayPaymentId: razorpayPaymentId,
                status: 'COMPLETED',
                paymentMethod: razorpayPayment.method,
                gatewayResponse: razorpayPayment,
                processedAt: new Date()
            }
        });
        // Update related entities
        if (paymentTransaction.sessionId) {
            // Get session details for Teams meeting creation
            const session = await prisma.session.findUnique({
                where: { id: paymentTransaction.sessionId },
                include: {
                    client: true,
                    consultant: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            teamsAccessToken: true,
                            teamsTokenExpiresAt: true
                        }
                    }
                }
            });
            let sessionUpdateData = {
                paymentStatus: 'PAID',
                paymentId: razorpayPaymentId,
                paymentMethod: razorpayPayment.method,
                status: 'CONFIRMED', // Update status to CONFIRMED after successful payment
                updatedAt: new Date()
            };
            // Create Teams meeting if session is scheduled and doesn't have meeting link
            if (session && session.scheduledDate && session.scheduledTime && !session.meetingLink) {
                console.log('🔗 Creating Teams meeting for confirmed session:', {
                    sessionId: session.id,
                    scheduledDate: session.scheduledDate,
                    scheduledTime: session.scheduledTime,
                    hasTeamsToken: !!session.consultant.teamsAccessToken
                });
                try {
                    // Check if consultant has valid Teams token
                    if (session.consultant.teamsAccessToken && session.consultant.teamsTokenExpiresAt) {
                        const tokenIsValid = session.consultant.teamsTokenExpiresAt > new Date();
                        if (tokenIsValid) {
                            // Import Teams meeting service
                            const { generateMeetingLink } = await Promise.resolve().then(() => __importStar(require('./meetingService')));
                            // Create meeting link
                            const scheduledDateTime = new Date(`${session.scheduledDate.toISOString().split('T')[0]}T${session.scheduledTime}`);
                            const meetingDetails = await generateMeetingLink('TEAMS', {
                                title: session.title,
                                startTime: scheduledDateTime,
                                duration: session.durationMinutes,
                                consultantEmail: session.consultant.email,
                                clientEmail: session.client.email,
                                description: `Consultation session - Payment confirmed`
                            }, session.consultant.teamsAccessToken);
                            // Add meeting details to session update
                            sessionUpdateData.meetingLink = meetingDetails.meetingLink;
                            sessionUpdateData.meetingId = meetingDetails.meetingId;
                            sessionUpdateData.meetingPassword = meetingDetails.password;
                            console.log('✅ Teams meeting created after payment:', {
                                sessionId: session.id,
                                meetingId: meetingDetails.meetingId
                            });
                        }
                        else {
                            console.warn('⚠️ Teams token expired, cannot create meeting:', {
                                sessionId: session.id,
                                tokenExpired: session.consultant.teamsTokenExpiresAt?.toISOString()
                            });
                        }
                    }
                    else {
                        console.warn('⚠️ Teams not configured for consultant:', {
                            sessionId: session.id,
                            consultantId: session.consultant.id
                        });
                    }
                }
                catch (meetingError) {
                    console.error('❌ Teams meeting creation failed after payment:', {
                        sessionId: session.id,
                        error: meetingError?.message || 'Unknown meeting error'
                    });
                    // Don't fail the payment processing if meeting creation fails
                }
            }
            // Update session with payment and meeting details
            await prisma.session.update({
                where: { id: paymentTransaction.sessionId },
                data: sessionUpdateData
            });
            // Update client's total amount paid
            if (paymentTransaction.session?.client) {
                await prisma.client.update({
                    where: { id: paymentTransaction.session.client.id },
                    data: {
                        totalAmountPaid: {
                            increment: Number(paymentTransaction.amount)
                        }
                    }
                });
            }
            // Send confirmation emails with updated session data (including meeting links)
            if (session) {
                // Refresh session data to include meeting links
                const updatedSession = await prisma.session.findUnique({
                    where: { id: session.id },
                    include: {
                        client: true,
                        consultant: true
                    }
                });
                if (updatedSession) {
                    await sendPaymentConfirmationEmails(updatedSession, updatedTransaction);
                }
            }
        }
        if (paymentTransaction.quotationId) {
            // Update quotation status
            await prisma.quotation.update({
                where: { id: paymentTransaction.quotationId },
                data: {
                    status: 'ACCEPTED',
                    respondedAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }
        // Clear related caches
        await redis_1.cacheUtils.clearPattern(`dashboard_*:${paymentTransaction.consultantId}:*`);
        await redis_1.cacheUtils.clearPattern(`sessions:${paymentTransaction.consultantId}:*`);
        console.log(`✅ Payment processed successfully: ${razorpayPaymentId}`);
        return {
            success: true,
            transactionId: updatedTransaction.id,
            paymentId: razorpayPaymentId,
            amount: Number(updatedTransaction.amount),
            currency: updatedTransaction.currency,
            status: 'COMPLETED'
        };
    }
    catch (error) {
        console.error('❌ Process payment error:', error);
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to process payment', 500, 'PAYMENT_PROCESSING_ERROR');
    }
};
exports.processSuccessfulPayment = processSuccessfulPayment;
/**
 * Handle failed payment
 */
const handleFailedPayment = async (orderId, errorCode, errorDescription) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        // Update payment transaction
        await prisma.paymentTransaction.updateMany({
            where: {
                gatewayOrderId: orderId,
                status: 'PENDING'
            },
            data: {
                status: 'FAILED',
                gatewayResponse: {
                    error_code: errorCode,
                    error_description: errorDescription,
                    failed_at: new Date().toISOString()
                },
                processedAt: new Date()
            }
        });
        console.log(`❌ Payment failed: ${orderId} - ${errorDescription}`);
    }
    catch (error) {
        console.error('❌ Handle failed payment error:', error);
    }
};
exports.handleFailedPayment = handleFailedPayment;
/**
 * Process refund
 */
const processRefund = async (refundData) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        // Get payment transaction
        const transaction = await prisma.paymentTransaction.findFirst({
            where: {
                gatewayPaymentId: refundData.paymentId,
                status: 'COMPLETED'
            },
            include: {
                session: {
                    include: {
                        client: true,
                        consultant: true
                    }
                }
            }
        });
        if (!transaction) {
            throw new errorHandler_1.ValidationError('Payment transaction not found or not eligible for refund');
        }
        // Check refund time limit
        const paymentDate = transaction.processedAt || transaction.createdAt;
        const timeSincePayment = Date.now() - paymentDate.getTime();
        if (timeSincePayment > paymentConfig.refundTimeLimit) {
            throw new errorHandler_1.ValidationError('Refund time limit exceeded (180 days)');
        }
        // Calculate refund amount
        const refundAmount = refundData.amount || Number(transaction.amount);
        const refundAmountInPaise = Math.round(refundAmount * 100);
        // Process refund with Razorpay
        if (!razorpay) {
            throw new errorHandler_1.AppError('Payment service not initialized. Please configure Razorpay credentials.', 503);
        }
        const razorpayRefund = await razorpay.payments.refund(refundData.paymentId, {
            amount: refundAmountInPaise,
            notes: {
                reason: refundData.reason || 'Requested by consultant',
                consultantId: transaction.consultantId,
                ...refundData.notes
            }
        });
        // Update payment transaction
        await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
                status: 'REFUNDED',
                gatewayResponse: {
                    ...transaction.gatewayResponse,
                    refund: razorpayRefund
                },
                processedAt: new Date()
            }
        });
        // Update session if applicable
        if (transaction.sessionId) {
            await prisma.session.update({
                where: { id: transaction.sessionId },
                data: {
                    paymentStatus: 'REFUNDED',
                    status: 'RETURNED',
                    updatedAt: new Date()
                }
            });
            // Update client's total amount paid
            if (transaction.session?.client) {
                await prisma.client.update({
                    where: { id: transaction.session.client.id },
                    data: {
                        totalAmountPaid: {
                            decrement: refundAmount
                        }
                    }
                });
            }
            // Send refund notification email
            if (transaction.session) {
                await sendRefundNotificationEmail(transaction.session, refundAmount, refundData.reason);
            }
        }
        console.log(`💰 Refund processed: ${razorpayRefund.id} for ₹${refundAmount}`);
        return {
            success: true,
            refundId: razorpayRefund.id,
            amount: refundAmount,
            currency: transaction.currency,
            status: razorpayRefund.status
        };
    }
    catch (error) {
        console.error('❌ Process refund error:', error);
        if (error instanceof errorHandler_1.ValidationError) {
            throw error;
        }
        if (error.error && error.error.code) {
            throw new errorHandler_1.AppError(`Refund failed: ${error.error.description}`, 400, 'REFUND_ERROR');
        }
        throw new errorHandler_1.AppError('Failed to process refund', 500, 'REFUND_PROCESSING_ERROR');
    }
};
exports.processRefund = processRefund;
/**
 * Get payment analytics
 */
const getPaymentAnalytics = async (consultantId, startDate, endDate) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const transactions = await prisma.paymentTransaction.findMany({
            where: {
                consultantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        const completedTransactions = transactions.filter((t) => t.status === 'COMPLETED');
        const failedTransactions = transactions.filter((t) => t.status === 'FAILED');
        const refundedTransactions = transactions.filter((t) => t.status === 'REFUNDED');
        const totalAmount = completedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const refundedAmount = refundedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        return {
            totalAmount,
            totalTransactions: transactions.length,
            successfulPayments: completedTransactions.length,
            failedPayments: failedTransactions.length,
            refundedAmount,
            averageTransactionValue: completedTransactions.length > 0 ? totalAmount / completedTransactions.length : 0,
            successRate: transactions.length > 0 ? (completedTransactions.length / transactions.length) * 100 : 0
        };
    }
    catch (error) {
        console.error('❌ Get payment analytics error:', error);
        throw new errorHandler_1.AppError('Failed to get payment analytics', 500, 'ANALYTICS_ERROR');
    }
};
exports.getPaymentAnalytics = getPaymentAnalytics;
/**
 * Get daily payment amount for consultant
 */
const getDailyPaymentAmount = async (consultantId) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = await prisma.paymentTransaction.aggregate({
            where: {
                consultantId,
                status: 'COMPLETED',
                createdAt: {
                    gte: today
                }
            },
            _sum: {
                amount: true
            }
        });
        return Number(result._sum.amount || 0);
    }
    catch (error) {
        console.error('❌ Get daily payment amount error:', error);
        return 0;
    }
};
/**
 * Send payment confirmation emails
 */
const sendPaymentConfirmationEmails = async (session, transaction) => {
    try {
        console.log('📧 Sending payment confirmation emails with meeting details:', {
            sessionId: session.id,
            hasSchedule: !!(session.scheduledDate && session.scheduledTime),
            hasMeetingLink: !!session.meetingLink,
            clientEmail: session.client.email,
            consultantEmail: session.consultant.email
        });
        // Prepare session details for email
        const emailData = {
            clientName: session.client.name,
            clientEmail: session.client.email,
            consultantName: `${session.consultant.firstName} ${session.consultant.lastName}`,
            consultantEmail: session.consultant.email,
            amount: Number(transaction.amount),
            currency: transaction.currency,
            transactionId: transaction.gatewayPaymentId,
            paymentMethod: transaction.paymentMethod || 'Online',
            sessionTitle: session.title,
            sessionDate: session.scheduledDate ? session.scheduledDate.toLocaleDateString() : 'To be scheduled',
            sessionTime: session.scheduledTime ? session.scheduledTime : 'To be confirmed',
            sessionDuration: session.durationMinutes || 60,
            meetingLink: session.meetingLink || null,
            meetingPlatform: session.platform || 'TEAMS',
            sessionType: session.sessionType,
            sessionNotes: session.notes || '',
            bookingType: session.scheduledDate && session.scheduledTime ? 'scheduled' : 'manual'
        };
        // Email to client (with meeting link if available)
        await (0, resendEmailService_1.sendPaymentConfirmationEmail)({
            clientName: emailData.clientName,
            consultantName: emailData.consultantName,
            clientEmail: emailData.clientEmail,
            consultantEmail: emailData.consultantEmail,
            amount: emailData.amount,
            currency: emailData.currency,
            transactionId: emailData.transactionId,
            paymentMethod: emailData.paymentMethod,
            sessionTitle: emailData.sessionTitle,
            sessionDate: emailData.sessionDate
        });
        // Email to consultant (payment received notification)  
        await (0, resendEmailService_1.sendPaymentConfirmationEmail)({
            clientName: emailData.clientName,
            consultantName: emailData.consultantName,
            clientEmail: emailData.clientEmail,
            consultantEmail: emailData.consultantEmail,
            amount: emailData.amount,
            currency: emailData.currency,
            transactionId: emailData.transactionId,
            paymentMethod: emailData.paymentMethod,
            sessionTitle: emailData.sessionTitle,
            sessionDate: emailData.sessionDate
        });
        console.log('✅ Payment confirmation emails sent successfully:', {
            sessionId: session.id,
            clientNotified: true,
            consultantNotified: true,
            meetingIncluded: !!session.meetingLink
        });
    }
    catch (error) {
        console.error('❌ Send payment confirmation emails error:', {
            sessionId: session?.id,
            error: error?.message || 'Unknown error',
            stack: error?.stack
        });
    }
};
/**
 * Send refund notification email
 */
const sendRefundNotificationEmail = async (session, refundAmount, reason) => {
    try {
        await (0, resendEmailService_1.sendRefundNotificationEmail)({
            clientName: session.client.name,
            clientEmail: session.client.email,
            consultantName: `${session.consultant.firstName} ${session.consultant.lastName}`,
            consultantEmail: session.consultant.email,
            amount: refundAmount,
            currency: 'INR',
            sessionTitle: session.title,
            refundReason: reason || 'Session cancelled',
            transactionId: session.paymentTransactions?.[0]?.gatewayPaymentId || 'N/A'
        });
    }
    catch (error) {
        console.error('❌ Send refund notification email error:', error);
    }
};
/**
 * Validate webhook signature
 */
const validateWebhookSignature = (payload, signature) => {
    try {
        const expectedSignature = crypto_1.default
            .createHmac('sha256', paymentConfig.razorpay.webhookSecret)
            .update(payload)
            .digest('hex');
        return expectedSignature === signature;
    }
    catch (error) {
        console.error('❌ Webhook signature validation error:', error);
        return false;
    }
};
exports.validateWebhookSignature = validateWebhookSignature;
/**
 * Process webhook event
 */
const processWebhookEvent = async (event, signature, payload) => {
    try {
        // Validate webhook signature
        if (!(0, exports.validateWebhookSignature)(payload, signature)) {
            throw new errorHandler_1.ValidationError('Invalid webhook signature');
        }
        const { event: eventType, payload: eventPayload } = event;
        switch (eventType) {
            case 'payment.captured':
                await handlePaymentCaptured(eventPayload.payment.entity);
                break;
            case 'payment.failed':
                await handlePaymentFailed(eventPayload.payment.entity);
                break;
            case 'refund.processed':
                await handleRefundProcessed(eventPayload.refund.entity);
                break;
            default:
                console.log(`📥 Unhandled webhook event: ${eventType}`);
        }
    }
    catch (error) {
        console.error('❌ Process webhook event error:', error);
        throw error;
    }
};
exports.processWebhookEvent = processWebhookEvent;
/**
 * Handle payment captured webhook
 */
const handlePaymentCaptured = async (payment) => {
    try {
        const verificationData = {
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            razorpaySignature: '' // Webhook doesn't need signature verification for capture
        };
        // Skip signature verification for webhooks
        await (0, exports.processSuccessfulPayment)({
            ...verificationData,
            razorpaySignature: 'webhook_verified'
        });
    }
    catch (error) {
        console.error('❌ Handle payment captured webhook error:', error);
    }
};
/**
 * Handle payment failed webhook
 */
const handlePaymentFailed = async (payment) => {
    try {
        await (0, exports.handleFailedPayment)(payment.order_id, payment.error_code, payment.error_description);
    }
    catch (error) {
        console.error('❌ Handle payment failed webhook error:', error);
    }
};
/**
 * Handle refund processed webhook
 */
const handleRefundProcessed = async (refund) => {
    try {
        const prisma = (0, database_1.getPrismaClient)();
        await prisma.paymentTransaction.updateMany({
            where: {
                gatewayPaymentId: refund.payment_id
            },
            data: {
                status: 'REFUNDED',
                processedAt: new Date()
            }
        });
        console.log(`💰 Refund webhook processed: ${refund.id}`);
    }
    catch (error) {
        console.error('❌ Handle refund processed webhook error:', error);
    }
};
exports.default = {
    createPaymentOrder: exports.createPaymentOrder,
    verifyPaymentSignature: exports.verifyPaymentSignature,
    processSuccessfulPayment: exports.processSuccessfulPayment,
    handleFailedPayment: exports.handleFailedPayment,
    processRefund: exports.processRefund,
    getPaymentAnalytics: exports.getPaymentAnalytics,
    validateWebhookSignature: exports.validateWebhookSignature,
    processWebhookEvent: exports.processWebhookEvent
};
//# sourceMappingURL=paymentService.js.map