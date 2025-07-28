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

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getPrismaClient } from '../config/database';
import { cacheUtils } from '../config/redis';
import { 
  sendPaymentConfirmationEmail as sendPaymentConfirmationViaResend, 
  sendRefundNotificationEmail as sendRefundNotificationViaResend 
} from './resendEmailService';
import { AppError, ValidationError } from '../middleware/errorHandler';

/**
 * Payment configuration
 */
const paymentConfig = {
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID!,
    keySecret: process.env.RAZORPAY_KEY_SECRET!,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!
  },

  // Currency settings
  defaultCurrency: 'INR',
  supportedCurrencies: ['INR', 'USD', 'EUR'],

  // Payment limits
  limits: {
    minimum: 1.00,      // Minimum ₹1
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
let razorpay: Razorpay | null = null;

// Only initialize Razorpay if credentials are provided
if (paymentConfig.razorpay.keyId && paymentConfig.razorpay.keySecret) {
  razorpay = new Razorpay({
    key_id: paymentConfig.razorpay.keyId,
    key_secret: paymentConfig.razorpay.keySecret,
  });
} else {
  console.warn('⚠️  Razorpay credentials not found. Payment functionality will be limited.');
}

/**
 * Payment interfaces
 */
interface PaymentOrderData {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  sessionId?: string;
  quotationId?: string;
  consultantId: string;
  clientEmail: string;
  clientName: string;
}

interface PaymentVerificationData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface RefundData {
  paymentId: string;
  amount?: number;
  reason?: string;
  notes?: Record<string, string>;
}

interface PaymentAnalytics {
  totalAmount: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  refundedAmount: number;
  averageTransactionValue: number;
  successRate: number;
}

/**
 * Create payment order
 */
export const createPaymentOrder = async (orderData: PaymentOrderData): Promise<any> => {
  try {
    // Validate amount
    if (orderData.amount < paymentConfig.limits.minimum) {
      throw new ValidationError(`Minimum payment amount is ₹${paymentConfig.limits.minimum}`);
    }

    if (orderData.amount > paymentConfig.limits.maximum) {
      throw new ValidationError(`Maximum payment amount is ₹${paymentConfig.limits.maximum}`);
    }

    // Check daily limit for consultant
    const dailyAmount = await getDailyPaymentAmount(orderData.consultantId);
    if (dailyAmount + orderData.amount > paymentConfig.limits.dailyLimit) {
      throw new ValidationError('Daily payment limit exceeded');
    }

    const prisma = getPrismaClient();

    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(orderData.amount * 100);

    // Generate unique receipt
    const receipt = orderData.receipt || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create Razorpay order
    if (!razorpay) {
      throw new AppError('Payment service not initialized. Please configure Razorpay credentials.', 503);
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
        gatewayResponse: razorpayOrder as any
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

  } catch (error: any) {
    console.error('❌ Create payment order error:', error);
    
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error.error && error.error.code) {
      throw new AppError(`Payment service error: ${error.error.description}`, 400, 'PAYMENT_SERVICE_ERROR');
    }

    throw new AppError('Failed to create payment order', 500, 'PAYMENT_ORDER_ERROR');
  }
};

/**
 * Verify payment signature
 */
export const verifyPaymentSignature = (
  verificationData: PaymentVerificationData
): boolean => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verificationData;

    // Create signature string
    const signatureString = `${razorpayOrderId}|${razorpayPaymentId}`;
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', paymentConfig.razorpay.keySecret)
      .update(signatureString)
      .digest('hex');

    // Compare signatures
    return expectedSignature === razorpaySignature;

  } catch (error) {
    console.error('❌ Payment signature verification error:', error);
    return false;
  }
};

/**
 * Process successful payment
 */
export const processSuccessfulPayment = async (
  verificationData: PaymentVerificationData
): Promise<any> => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = verificationData;
    const prisma = getPrismaClient();

    // Verify signature first
    if (!verifyPaymentSignature(verificationData)) {
      throw new ValidationError('Invalid payment signature');
    }

    // Get payment details from Razorpay
    if (!razorpay) {
      throw new AppError('Payment service not initialized. Please configure Razorpay credentials.', 503);
    }
    
    const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);
    
    if (razorpayPayment.status !== 'captured') {
      throw new ValidationError('Payment not captured');
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
      throw new ValidationError('Payment transaction not found or already processed');
    }

    // Update payment transaction
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: {
        gatewayPaymentId: razorpayPaymentId,
        status: 'COMPLETED',
        paymentMethod: razorpayPayment.method,
        gatewayResponse: razorpayPayment as any,
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

      let sessionUpdateData: any = {
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
              const { generateMeetingLink } = await import('./meetingService');
              
              // Create meeting link
              const scheduledDateTime = new Date(`${session.scheduledDate.toISOString().split('T')[0]}T${session.scheduledTime}`);
              
              const meetingDetails = await generateMeetingLink(
                'TEAMS',
                {
                  title: session.title,
                  startTime: scheduledDateTime,
                  duration: session.durationMinutes,
                  consultantEmail: session.consultant.email,
                  clientEmail: session.client.email,
                  description: `Consultation session - Payment confirmed`
                },
                session.consultant.teamsAccessToken
              );

              // Add meeting details to session update
              sessionUpdateData.meetingLink = meetingDetails.meetingLink;
              sessionUpdateData.meetingId = meetingDetails.meetingId;
              sessionUpdateData.meetingPassword = meetingDetails.password;

              console.log('✅ Teams meeting created after payment:', {
                sessionId: session.id,
                meetingId: meetingDetails.meetingId
              });
            } else {
              console.warn('⚠️ Teams token expired, cannot create meeting:', {
                sessionId: session.id,
                tokenExpired: session.consultant.teamsTokenExpiresAt?.toISOString()
              });
            }
          } else {
            console.warn('⚠️ Teams not configured for consultant:', {
              sessionId: session.id,
              consultantId: session.consultant.id
            });
          }
        } catch (meetingError: any) {
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
    await cacheUtils.clearPattern(`dashboard_*:${paymentTransaction.consultantId}:*`);
    await cacheUtils.clearPattern(`sessions:${paymentTransaction.consultantId}:*`);

    console.log(`✅ Payment processed successfully: ${razorpayPaymentId}`);

    return {
      success: true,
      transactionId: updatedTransaction.id,
      paymentId: razorpayPaymentId,
      amount: Number(updatedTransaction.amount),
      currency: updatedTransaction.currency,
      status: 'COMPLETED'
    };

  } catch (error: any) {
    console.error('❌ Process payment error:', error);
    
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new AppError('Failed to process payment', 500, 'PAYMENT_PROCESSING_ERROR');
  }
};

/**
 * Handle failed payment
 */
export const handleFailedPayment = async (
  orderId: string,
  errorCode?: string,
  errorDescription?: string
): Promise<void> => {
  try {
    const prisma = getPrismaClient();

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

  } catch (error) {
    console.error('❌ Handle failed payment error:', error);
  }
};

/**
 * Process refund
 */
export const processRefund = async (refundData: RefundData): Promise<any> => {
  try {
    const prisma = getPrismaClient();

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
      throw new ValidationError('Payment transaction not found or not eligible for refund');
    }

    // Check refund time limit
    const paymentDate = transaction.processedAt || transaction.createdAt;
    const timeSincePayment = Date.now() - paymentDate.getTime();
    
    if (timeSincePayment > paymentConfig.refundTimeLimit) {
      throw new ValidationError('Refund time limit exceeded (180 days)');
    }

    // Calculate refund amount
    const refundAmount = refundData.amount || Number(transaction.amount);
    const refundAmountInPaise = Math.round(refundAmount * 100);

    // Process refund with Razorpay
    if (!razorpay) {
      throw new AppError('Payment service not initialized. Please configure Razorpay credentials.', 503);
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
          ...transaction.gatewayResponse as any,
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

  } catch (error: any) {
    console.error('❌ Process refund error:', error);
    
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error.error && error.error.code) {
      throw new AppError(`Refund failed: ${error.error.description}`, 400, 'REFUND_ERROR');
    }

    throw new AppError('Failed to process refund', 500, 'REFUND_PROCESSING_ERROR');
  }
};

/**
 * Get payment analytics
 */
export const getPaymentAnalytics = async (
  consultantId: string,
  startDate: Date,
  endDate: Date
): Promise<PaymentAnalytics> => {
  try {
    const prisma = getPrismaClient();

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        consultantId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const completedTransactions = transactions.filter((t: any) => t.status === 'COMPLETED');
    const failedTransactions = transactions.filter((t: any) => t.status === 'FAILED');
    const refundedTransactions = transactions.filter((t:any) => t.status === 'REFUNDED');

    const totalAmount = completedTransactions.reduce((sum:any, t:any) => sum + Number(t.amount), 0);
    const refundedAmount = refundedTransactions.reduce((sum:any, t:any) => sum + Number(t.amount), 0);

    return {
      totalAmount,
      totalTransactions: transactions.length,
      successfulPayments: completedTransactions.length,
      failedPayments: failedTransactions.length,
      refundedAmount,
      averageTransactionValue: completedTransactions.length > 0 ? totalAmount / completedTransactions.length : 0,
      successRate: transactions.length > 0 ? (completedTransactions.length / transactions.length) * 100 : 0
    };

  } catch (error) {
    console.error('❌ Get payment analytics error:', error);
    throw new AppError('Failed to get payment analytics', 500, 'ANALYTICS_ERROR');
  }
};

/**
 * Get daily payment amount for consultant
 */
const getDailyPaymentAmount = async (consultantId: string): Promise<number> => {
  try {
    const prisma = getPrismaClient();
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

  } catch (error) {
    console.error('❌ Get daily payment amount error:', error);
    return 0;
  }
};

/**
 * Send payment confirmation emails
 */
const sendPaymentConfirmationEmails = async (
  session: any,
  transaction: any
): Promise<void> => {
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
    await sendPaymentConfirmationViaResend({
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
    await sendPaymentConfirmationViaResend({
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

  } catch (error: any) {
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
const sendRefundNotificationEmail = async (
  session: any,
  refundAmount: number,
  reason?: string
): Promise<void> => {
  try {
    await sendRefundNotificationViaResend({
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

  } catch (error) {
    console.error('❌ Send refund notification email error:', error);
  }
};

/**
 * Validate webhook signature
 */
export const validateWebhookSignature = (
  payload: string,
  signature: string
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', paymentConfig.razorpay.webhookSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;

  } catch (error) {
    console.error('❌ Webhook signature validation error:', error);
    return false;
  }
};

/**
 * Process webhook event
 */
export const processWebhookEvent = async (
  event: any,
  signature: string,
  payload: string
): Promise<void> => {
  try {
    // Validate webhook signature
    if (!validateWebhookSignature(payload, signature)) {
      throw new ValidationError('Invalid webhook signature');
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

  } catch (error) {
    console.error('❌ Process webhook event error:', error);
    throw error;
  }
};

/**
 * Handle payment captured webhook
 */
const handlePaymentCaptured = async (payment: any): Promise<void> => {
  try {
    const verificationData: PaymentVerificationData = {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      razorpaySignature: '' // Webhook doesn't need signature verification for capture
    };

    // Skip signature verification for webhooks
    await processSuccessfulPayment({
      ...verificationData,
      razorpaySignature: 'webhook_verified'
    });

  } catch (error) {
    console.error('❌ Handle payment captured webhook error:', error);
  }
};

/**
 * Handle payment failed webhook
 */
const handlePaymentFailed = async (payment: any): Promise<void> => {
  try {
    await handleFailedPayment(
      payment.order_id,
      payment.error_code,
      payment.error_description
    );

  } catch (error) {
    console.error('❌ Handle payment failed webhook error:', error);
  }
};

/**
 * Handle refund processed webhook
 */
const handleRefundProcessed = async (refund: any): Promise<void> => {
  try {
    const prisma = getPrismaClient();

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

  } catch (error) {
    console.error('❌ Handle refund processed webhook error:', error);
  }
};

export default {
  createPaymentOrder,
  verifyPaymentSignature,
  processSuccessfulPayment,
  handleFailedPayment,
  processRefund,
  getPaymentAnalytics,
  validateWebhookSignature,
  processWebhookEvent
};