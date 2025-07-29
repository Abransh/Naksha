"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errorHandler_1 = require("../../middleware/errorHandler");
const paymentService_1 = require("../../services/paymentService");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
const createOrderSchema = zod_1.z.object({
    sessionId: zod_1.z.string().optional(),
    quotationId: zod_1.z.string().optional(),
    amount: zod_1.z.number().gte(0, 'Amount cannot be negative').max(500000),
    currency: zod_1.z.string().default('INR'),
    clientEmail: zod_1.z.string().email(),
    clientName: zod_1.z.string().min(1),
    notes: zod_1.z.record(zod_1.z.string()).optional()
});
const verifyPaymentSchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string(),
    razorpayPaymentId: zod_1.z.string(),
    razorpaySignature: zod_1.z.string()
});
const failedPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    errorCode: zod_1.z.string().optional(),
    errorDescription: zod_1.z.string().optional()
});
/**
 * POST /payments/public/create-order
 * Create payment order for public session booking (no auth required)
 */
router.post('/public/create-order', (0, validation_1.validateRequest)(createOrderSchema), async (req, res) => {
    try {
        const { sessionId, amount, currency, clientEmail, clientName, notes } = req.body;
        if (!sessionId) {
            throw new errorHandler_1.ValidationError('sessionId is required for public payments');
        }
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errorHandler_1.ValidationError('Session not found or payment already processed');
        }
        // Verify amount matches session amount
        if (Math.abs(Number(session.amount) - amount) > 0.01) {
            throw new errorHandler_1.ValidationError('Amount mismatch with session');
        }
        // Create payment order
        const paymentOrder = await (0, paymentService_1.createPaymentOrder)({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError)
            throw error;
        console.error('Error creating public payment order:', error);
        throw new errorHandler_1.AppError('Failed to create payment order');
    }
});
/**
 * POST /payments/public/verify
 * Verify payment for public session booking (no auth required)
 */
router.post('/public/verify', (0, validation_1.validateRequest)(verifyPaymentSchema), async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        // Process successful payment
        const result = await (0, paymentService_1.processSuccessfulPayment)({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError)
            throw error;
        console.error('Error verifying public payment:', error);
        throw new errorHandler_1.AppError('Payment verification failed');
    }
});
/**
 * POST /payments/create-order
 * Create payment order for session booking or quotation (authenticated)
 */
router.post('/create-order', auth_1.authenticateConsultant, (0, validation_1.validateRequest)(createOrderSchema), async (req, res) => {
    try {
        const consultantId = req.user.id;
        const { sessionId, quotationId, amount, currency, clientEmail, clientName, notes } = req.body;
        // Validate that either sessionId or quotationId is provided
        if (!sessionId && !quotationId) {
            throw new errorHandler_1.ValidationError('Either sessionId or quotationId must be provided');
        }
        const prisma = (0, database_1.getPrismaClient)();
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
                throw new errorHandler_1.ValidationError('Session not found or payment already processed');
            }
            // Verify amount matches session amount
            if (Math.abs(Number(session.amount) - amount) > 0.01) {
                throw new errorHandler_1.ValidationError('Amount mismatch with session');
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
                throw new errorHandler_1.ValidationError('Quotation not found or not in valid state');
            }
            // Verify amount matches quotation amount
            if (Math.abs(Number(quotation.finalAmount) - amount) > 0.01) {
                throw new errorHandler_1.ValidationError('Amount mismatch with quotation');
            }
        }
        // Create payment order
        const paymentOrder = await (0, paymentService_1.createPaymentOrder)({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError)
            throw error;
        console.error('Error creating payment order:', error);
        throw new errorHandler_1.AppError('Failed to create payment order');
    }
});
/**
 * POST /payments/verify
 * Verify payment and process successful transaction
 */
router.post('/verify', (0, validation_1.validateRequest)(verifyPaymentSchema), async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        // Process successful payment
        const result = await (0, paymentService_1.processSuccessfulPayment)({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.ValidationError)
            throw error;
        console.error('Error verifying payment:', error);
        throw new errorHandler_1.AppError('Payment verification failed');
    }
});
/**
 * POST /payments/failed
 * Handle failed payment notification
 */
router.post('/failed', (0, validation_1.validateRequest)(failedPaymentSchema), async (req, res) => {
    try {
        const { orderId, errorCode, errorDescription } = req.body;
        await (0, paymentService_1.handleFailedPayment)(orderId, errorCode, errorDescription);
        console.log('❌ Failed payment handled:', {
            orderId,
            errorCode,
            errorDescription
        });
        res.json({
            success: true,
            message: 'Failed payment handled successfully'
        });
    }
    catch (error) {
        console.error('Error handling failed payment:', error);
        throw new errorHandler_1.AppError('Failed to handle payment failure');
    }
});
/**
 * POST /payments/webhook
 * Handle Razorpay webhook events
 */
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const payload = JSON.stringify(req.body);
        if (!signature) {
            throw new errorHandler_1.ValidationError('Missing webhook signature');
        }
        // Process webhook event
        await (0, paymentService_1.processWebhookEvent)(req.body, signature, payload);
        console.log('📥 Webhook processed:', {
            event: req.body.event,
            paymentId: req.body.payload?.payment?.entity?.id || 'N/A'
        });
        res.json({
            success: true,
            message: 'Webhook processed successfully'
        });
    }
    catch (error) {
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
router.get('/config', (req, res) => {
    try {
        const config = {
            keyId: process.env.RAZORPAY_KEY_ID,
            currency: 'INR',
            company: {
                name: 'Naksha Consulting',
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
    }
    catch (error) {
        console.error('Error getting payment config:', error);
        throw new errorHandler_1.AppError('Failed to get payment configuration');
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map