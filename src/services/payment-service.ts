// Payment service for certificate verification fees
export interface PaymentIntentData {
  certificateId: string;
  certificateNumber: string;
  amount: number; // in cents ($1.00 = 100)
  currency: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

export interface VerificationPayment {
  id: string;
  certificateId: string;
  certificateNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  paymentIntentId: string;
  createdAt: string;
  expiresAt: string;
}

export class PaymentService {
  private static readonly VERIFICATION_FEE = 100; // $1.00 in cents
  
  /**
   * Create payment intent for certificate verification
   */
  async createVerificationPayment(certificateData: {
    certificateId: string;
    certificateNumber: string;
  }): Promise<PaymentResult> {
    try {
      const response = await fetch('/api/payments/create-verification-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateId: certificateData.certificateId,
          certificateNumber: certificateData.certificateNumber,
          amount: PaymentService.VERIFICATION_FEE,
          currency: 'usd',
          description: `Certificate Verification - ${certificateData.certificateNumber}`,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          paymentIntentId: result.paymentIntentId,
          clientSecret: result.clientSecret,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create payment intent',
        };
      }
    } catch (error) {
      console.error('Payment service error:', error);
      return {
        success: false,
        error: 'Payment service unavailable',
      };
    }
  }

  /**
   * Verify payment status before showing verification results
   */
  async verifyPaymentStatus(paymentIntentId: string): Promise<{
    paid: boolean;
    status: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/payments/verify-payment-status?paymentIntentId=${paymentIntentId}`);
      const result = await response.json();
      
      return {
        paid: result.success && result.status === 'succeeded',
        status: result.status || 'unknown',
        error: result.error,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        paid: false,
        status: 'error',
        error: 'Payment verification failed',
      };
    }
  }

  /**
   * Get verification cost information
   */
  static getVerificationCost(): {
    amount: number;
    currency: string;
    displayAmount: string;
  } {
    return {
      amount: PaymentService.VERIFICATION_FEE,
      currency: 'usd',
      displayAmount: '$1.00',
    };
  }

  /**
   * Check if payment is required for verification
   * In a real system, this might check user subscription, free tier, etc.
   */
  static isPaymentRequired(): boolean {
    return true; // Always require payment for now
  }
}

export const paymentService = new PaymentService();