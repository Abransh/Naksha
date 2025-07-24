// PERFORMANCE OPTIMIZED Razorpay Payment Hook
// Handles payment processing with timeout control and error recovery

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Razorpay types
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name: string;
    email: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
    confirm_close: boolean;
    escape: boolean;
    backdropclose: boolean;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentOrderData {
  sessionId?: string;
  quotationId?: string;
  amount: number;
  currency?: string;
  clientEmail: string;
  clientName: string;
  notes?: Record<string, string>;
}

interface PaymentConfig {
  keyId: string;
  currency: string;
  company: {
    name: string;
    logo: string;
    theme: {
      color: string;
    };
  };
}

// Declare Razorpay as global
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open(): void;
      on(event: string, callback: () => void): void;
    };
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Performance Configuration for Payment Processing
const PAYMENT_TIMEOUTS = {
  CONFIG_FETCH: 10000,    // 10 seconds to get payment config
  ORDER_CREATE: 15000,    // 15 seconds to create payment order
  PAYMENT_VERIFY: 20000,  // 20 seconds to verify payment
  TOTAL_FLOW: 60000,      // 60 seconds for entire payment flow
};

export const useRazorpayPayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  
  // Load Razorpay script dynamically
  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // OPTIMIZED: Get payment configuration with timeout
  const getPaymentConfig = useCallback(async (): Promise<PaymentConfig | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYMENT_TIMEOUTS.CONFIG_FETCH);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get payment configuration');
      }

      const result = await response.json();
      console.log('✅ Payment config loaded successfully');
      return result.data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('❌ Payment config timeout after', PAYMENT_TIMEOUTS.CONFIG_FETCH, 'ms');
        toast.error('Payment configuration timeout. Please try again.');
      } else {
        console.error('❌ Payment config error:', error);
        toast.error('Failed to load payment configuration');
      }
      return null;
    }
  }, []);

  // OPTIMIZED: Create payment order with timeout
  const createPaymentOrder = useCallback(async (orderData: PaymentOrderData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYMENT_TIMEOUTS.ORDER_CREATE);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(orderData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment order');
      }

      const result = await response.json();
      console.log('✅ Payment order created successfully:', result.data.orderId);
      return result.data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('❌ Payment order timeout after', PAYMENT_TIMEOUTS.ORDER_CREATE, 'ms');
        toast.error('Payment order creation timeout. Please try again.');
      } else {
        console.error('❌ Payment order error:', error);
      }
      throw error;
    }
  }, []);

  // OPTIMIZED: Verify payment with timeout
  const verifyPayment = useCallback(async (verificationData: RazorpayResponse) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYMENT_TIMEOUTS.PAYMENT_VERIFY);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpayOrderId: verificationData.razorpay_order_id,
          razorpayPaymentId: verificationData.razorpay_payment_id,
          razorpaySignature: verificationData.razorpay_signature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment verification failed');
      }

      const result = await response.json();
      console.log('✅ Payment verified successfully:', verificationData.razorpay_payment_id);
      return result.data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('❌ Payment verification timeout after', PAYMENT_TIMEOUTS.PAYMENT_VERIFY, 'ms');
        toast.error('Payment verification timeout. Please contact support.');
      } else {
        console.error('❌ Payment verification error:', error);
      }
      throw error;
    }
  }, []);

  // Handle payment failure
  const handlePaymentFailure = useCallback(async (orderId: string, error?: any) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/payments/failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          errorCode: error?.code,
          errorDescription: error?.description || 'Payment cancelled by user',
        }),
      });
    } catch (err) {
      console.error('Error handling payment failure:', err);
    }
  }, []);

  // OPTIMIZED: Main payment processing with total timeout control
  const processPayment = useCallback(async (
    orderData: PaymentOrderData,
    onSuccess?: (paymentData: any) => void,
    onFailure?: (error: any) => void
  ) => {
    setIsLoading(true);
    
    // Total payment flow timeout
    const totalTimeout = setTimeout(() => {
      console.error('❌ Total payment flow timeout after', PAYMENT_TIMEOUTS.TOTAL_FLOW, 'ms');
      toast.error('Payment process timeout. Please try again.');
      onFailure?.({ message: 'Payment timeout', code: 'PAYMENT_TIMEOUT' });
      setIsLoading(false);
    }, PAYMENT_TIMEOUTS.TOTAL_FLOW);

    try {
      console.log('🚀 Starting optimized payment flow...', {
        sessionId: orderData.sessionId,
        amount: orderData.amount,
        timeout: `${PAYMENT_TIMEOUTS.TOTAL_FLOW}ms`
      });
      // Load Razorpay script
      const isRazorpayLoaded = await loadRazorpayScript();
      if (!isRazorpayLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Get payment configuration
      let config = paymentConfig;
      if (!config) {
        config = await getPaymentConfig();
        if (!config) {
          throw new Error('Failed to load payment configuration');
        }
        setPaymentConfig(config);
      }

      // Create payment order
      const paymentOrder = await createPaymentOrder(orderData);

      console.log('💳 Payment order created:', paymentOrder);

      // Configure Razorpay options
      const options: RazorpayOptions = {
        key: config.keyId,
        amount: paymentOrder.amount * 100, // Convert to paise
        currency: paymentOrder.currency || 'INR',
        order_id: paymentOrder.orderId,
        name: config.company.name,
        description: orderData.sessionId 
          ? `Session Payment - ${orderData.clientName}`
          : `Quotation Payment - ${orderData.clientName}`,
        image: config.company.logo,
        prefill: {
          name: orderData.clientName,
          email: orderData.clientEmail,
          contact: orderData.notes?.phone || '',
        },
        theme: {
          color: config.company.theme.color,
        },
        handler: async (response: RazorpayResponse) => {
          try {
            console.log('💳 Payment successful, verifying...', response);
            
            // Verify payment with backend
            const verificationResult = await verifyPayment(response);
            
            console.log('✅ Payment verified:', verificationResult);
            toast.success('Payment successful! Session confirmed.');
            
            clearTimeout(totalTimeout); // Clear timeout on success
            onSuccess?.(verificationResult);
          } catch (error) {
            console.error('❌ Payment verification failed:', error);
            toast.error('Payment verification failed. Please contact support.');
            onFailure?.(error);
          }
        },
        modal: {
          ondismiss: async () => {
            console.log('💳 Payment modal dismissed');
            clearTimeout(totalTimeout); // Clear timeout on cancellation
            await handlePaymentFailure(paymentOrder.orderId, { description: 'Payment cancelled by user' });
            toast.info('Payment cancelled');
            onFailure?.({ message: 'Payment cancelled by user' });
          },
          confirm_close: true,
          escape: true,
          backdropclose: false,
        },
      };

      // Initialize and open Razorpay
      const razorpayInstance = new window.Razorpay(options);
      
      razorpayInstance.on('payment.failed', () => {
        console.error('💳 Payment failed');
        clearTimeout(totalTimeout); // Clear timeout on payment failure
        handlePaymentFailure(paymentOrder.orderId, 'Payment failed').catch(console.error);
        toast.error('Payment failed. Please try again.');
        onFailure?.('Payment failed');
      });

      razorpayInstance.open();

    } catch (error) {
      console.error('💳 Payment processing error:', error);
      clearTimeout(totalTimeout); // Clear timeout on error
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      toast.error(errorMessage);
      onFailure?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [
    paymentConfig,
    loadRazorpayScript,
    getPaymentConfig,
    createPaymentOrder,
    verifyPayment,
    handlePaymentFailure
  ]);

  return {
    processPayment,
    isLoading,
    paymentConfig,
  };
};