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
export declare const createPaymentOrder: (orderData: PaymentOrderData) => Promise<any>;
/**
 * Verify payment signature
 */
export declare const verifyPaymentSignature: (verificationData: PaymentVerificationData) => boolean;
/**
 * Process successful payment
 */
export declare const processSuccessfulPayment: (verificationData: PaymentVerificationData) => Promise<any>;
/**
 * Handle failed payment
 */
export declare const handleFailedPayment: (orderId: string, errorCode?: string, errorDescription?: string) => Promise<void>;
/**
 * Process refund
 */
export declare const processRefund: (refundData: RefundData) => Promise<any>;
/**
 * Get payment analytics
 */
export declare const getPaymentAnalytics: (consultantId: string, startDate: Date, endDate: Date) => Promise<PaymentAnalytics>;
/**
 * Validate webhook signature
 */
export declare const validateWebhookSignature: (payload: string, signature: string) => boolean;
/**
 * Process webhook event
 */
export declare const processWebhookEvent: (event: any, signature: string, payload: string) => Promise<void>;
declare const _default: {
    createPaymentOrder: (orderData: PaymentOrderData) => Promise<any>;
    verifyPaymentSignature: (verificationData: PaymentVerificationData) => boolean;
    processSuccessfulPayment: (verificationData: PaymentVerificationData) => Promise<any>;
    handleFailedPayment: (orderId: string, errorCode?: string, errorDescription?: string) => Promise<void>;
    processRefund: (refundData: RefundData) => Promise<any>;
    getPaymentAnalytics: (consultantId: string, startDate: Date, endDate: Date) => Promise<PaymentAnalytics>;
    validateWebhookSignature: (payload: string, signature: string) => boolean;
    processWebhookEvent: (event: any, signature: string, payload: string) => Promise<void>;
};
export default _default;
//# sourceMappingURL=paymentService.d.ts.map