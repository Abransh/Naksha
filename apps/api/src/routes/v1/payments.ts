/**
 * File Path: apps/api/src/routes/v1/payments.ts
 * 
 * Payment Routes
 * 
 * Handles all payment-related operations:
 * - Payment order creation for session bookings
 * - Payment verification and processing
 * - Webhook handling for payment status updates
 * - Error handling and validation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../config/database';
import { AuthenticatedRequest, authenticateConsultant } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { AppError, ValidationError } from '../../middleware/errorHandler';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  processSuccessfulPayment,
  handleFailedPayment,
  processWebhookEvent
} from '../../services/paymentService';

const router = Router();

/**
 * Validation schemas
 */
const createOrderSchema = z.object({
  sessionId: z.string().optional(),
  quotationId: z.string().optional(),
  amount: z.number().gte(0, 'Amount cannot be negative').max(500000),
  currency: z.string().default('INR'),
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  notes: z.record(z.string()).optional()
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string()
});

const failedPaymentSchema = z.object({
  orderId: z.string(),
  errorCode: z.string().optional(),
  errorDescription: z.string().optional()
});

/**
 * POST /payments/public/create-order
 * Create payment order for public session booking (no auth required)
 */
router.post('/public/create-order',
  validateRequest(createOrderSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sessionId,
        amount,
        currency,
        clientEmail,
        clientName,
        notes
      } = req.body;

      if (!sessionId) {
        throw new ValidationError('sessionId is required for public payments');
      }

      // Validate sessionId format
      if (typeof sessionId !== 'string' || sessionId.trim() === '' || sessionId === 'undefined') {
        throw new ValidationError('Invalid sessionId provided');
      }

      console.log('💳 Creating public payment order:', {
        sessionId,
        amount,
        clientEmail,
        clientName
      });

      const prisma = getPrismaClient();

      // Verify session exists and is pending payment
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          paymentStatus: 'PENDING'
        },
        include: {
          consultant: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!session) {
        console.error('❌ Session not found for payment:', {
          sessionId,
          searchCriteria: {
            id: sessionId,
            paymentStatus: 'PENDING'
          }
        });
        throw new ValidationError('Session not found or payment already processed');
      }

      console.log('✅ Session found for payment:', {
        sessionId: session.id,
        consultantId: session.consultantId,
        sessionAmount: session.amount,
        requestedAmount: amount
      });

      // Verify amount matches session amount
      if (Math.abs(Number(session.amount) - amount) > 0.01) {
        throw new ValidationError('Amount mismatch with session');
      }

      // Create payment order
      const paymentOrder = await createPaymentOrder({
        sessionId,
        consultantId: session.consultantId,
        amount,
        currency,
        clientEmail,
        clientName,
        notes
      });

      console.log('💳 Public payment order created:', {
        orderId: paymentOrder.orderId,
        amount,
        sessionId,
        consultantId: session.consultantId
      });

      res.json({
        success: true,
        message: 'Payment order created successfully',
        data: paymentOrder
      });

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error creating public payment order:', error);
      throw new AppError('Failed to create payment order');
    }
  }
);

/**
 * POST /payments/public/verify
 * Verify payment for public session booking (no auth required)
 */
router.post('/public/verify',
  validateRequest(verifyPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      } = req.body;

      // Process successful payment
      const result = await processSuccessfulPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      console.log('✅ Public payment verified and processed:', {
        paymentId: razorpayPaymentId,
        transactionId: result.transactionId,
        amount: result.amount
      });

      res.json({
        success: true,
        message: 'Payment verified and processed successfully',
        data: result
      });

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error verifying public payment:', error);
      throw new AppError('Payment verification failed');
    }
  }
);

/**
 * POST /payments/create-order
 * Create payment order for session booking or quotation (authenticated)
 */
router.post('/create-order',
  authenticateConsultant,
  validateRequest(createOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const consultantId = req.user!.id;
      const {
        sessionId,
        quotationId,
        amount,
        currency,
        clientEmail,
        clientName,
        notes
      } = req.body;

      // Validate that either sessionId or quotationId is provided
      if (!sessionId && !quotationId) {
        throw new ValidationError('Either sessionId or quotationId must be provided');
      }

      const prisma = getPrismaClient();

      // Verify session or quotation belongs to consultant
      if (sessionId) {
        const session = await prisma.session.findFirst({
          where: {
            id: sessionId,
            consultantId,
            paymentStatus: 'PENDING'
          }
        });

        if (!session) {
          throw new ValidationError('Session not found or payment already processed');
        }

        // Verify amount matches session amount
        if (Math.abs(Number(session.amount) - amount) > 0.01) {
          throw new ValidationError('Amount mismatch with session');
        }
      }

      if (quotationId) {
        const quotation = await prisma.quotation.findFirst({
          where: {
            id: quotationId,
            consultantId,
            status: 'SENT'
          }
        });

        if (!quotation) {
          throw new ValidationError('Quotation not found or not in valid state');
        }

        // Verify amount matches quotation amount
        if (Math.abs(Number(quotation.finalAmount) - amount) > 0.01) {
          throw new ValidationError('Amount mismatch with quotation');
        }
      }

      // Create payment order
      const paymentOrder = await createPaymentOrder({
        sessionId,
        quotationId,
        consultantId,
        amount,
        currency,
        clientEmail,
        clientName,
        notes
      });

      console.log('💳 Payment order created:', {
        orderId: paymentOrder.orderId,
        amount,
        consultantId,
        sessionId,
        quotationId
      });

      res.json({
        success: true,
        message: 'Payment order created successfully',
        data: paymentOrder
      });

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error creating payment order:', error);
      throw new AppError('Failed to create payment order');
    }
  }
);

/**
 * POST /payments/verify
 * Verify payment and process successful transaction
 */
router.post('/verify',
  validateRequest(verifyPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      } = req.body;

      // Process successful payment
      const result = await processSuccessfulPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      console.log('✅ Payment verified and processed:', {
        paymentId: razorpayPaymentId,
        transactionId: result.transactionId,
        amount: result.amount
      });

      res.json({
        success: true,
        message: 'Payment verified and processed successfully',
        data: result
      });

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('Error verifying payment:', error);
      throw new AppError('Payment verification failed');
    }
  }
);

/**
 * POST /payments/failed
 * Handle failed payment notification
 */
router.post('/failed',
  validateRequest(failedPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId, errorCode, errorDescription } = req.body;

      await handleFailedPayment(orderId, errorCode, errorDescription);

      console.log('❌ Failed payment handled:', {
        orderId,
        errorCode,
        errorDescription
      });

      res.json({
        success: true,
        message: 'Failed payment handled successfully'
      });

    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw new AppError('Failed to handle payment failure');
    }
  }
);

/**
 * POST /payments/webhook
 * Handle Razorpay webhook events
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      throw new ValidationError('Missing webhook signature');
    }

    // Process webhook event
    await processWebhookEvent(req.body, signature, payload);

    console.log('📥 Webhook processed:', {
      event: req.body.event,
      paymentId: req.body.payload?.payment?.entity?.id || 'N/A'
    });

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return success to prevent Razorpay retries for invalid webhooks
    res.json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

/**
 * GET /payments/config
 * Get payment configuration for frontend
 */
router.get('/config', (req: Request, res: Response): void => {
  try {
    const config = {
      keyId: process.env.RAZORPAY_KEY_ID,
      currency: 'INR',
      company: {
        name: 'Nakksha Consulting',
        logo: '/assets/naksha-logo.png',
        theme: {
          color: '#3B82F6'
        }
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error getting payment config:', error);
    throw new AppError('Failed to get payment configuration');
  }
});

export default router;