// apps/consulatant-dashboard/src/hooks/useRazorpayPayment.ts

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

  // Get payment configuration from backend
  const getPaymentConfig = useCallback(async (): Promise<PaymentConfig | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get payment configuration');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting payment config:', error);
      toast.error('Failed to load payment configuration');
      return null;
    }
  }, []);

  // Create payment order
  const createPaymentOrder = useCallback(async (orderData: PaymentOrderData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Get JWT token
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment order');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating payment order:', error);
      throw error;
    }
  }, []);

  // Verify payment
  const verifyPayment = useCallback(async (verificationData: RazorpayResponse) => {
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
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment verification failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error verifying payment:', error);
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

  // Main payment processing function
  const processPayment = useCallback(async (
    orderData: PaymentOrderData,
    onSuccess?: (paymentData: any) => void,
    onFailure?: (error: any) => void
  ) => {
    setIsLoading(true);

    try {
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
      
      razorpayInstance.on('payment.failed', async (response: any) => {
        console.error('💳 Payment failed:', response.error);
        await handlePaymentFailure(paymentOrder.orderId, response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        onFailure?.(response.error);
      });

      razorpayInstance.open();

    } catch (error) {
      console.error('💳 Payment processing error:', error);
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