'use client';

import { useState } from 'react';
import { paymentService, PaymentService } from '@/services/payment-service';

interface VerificationPaymentProps {
  certificateId: string;
  certificateNumber: string;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
}

export default function VerificationPayment({
  certificateId,
  certificateNumber,
  onPaymentSuccess,
  onPaymentCancel,
}: VerificationPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [showDemoPayment, setShowDemoPayment] = useState(false);

  const cost = PaymentService.getVerificationCost();

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      // Create payment intent
      const paymentResult = await paymentService.createVerificationPayment({
        certificateId,
        certificateNumber,
      });

      if (paymentResult.success && paymentResult.paymentIntentId) {
        setPaymentIntentId(paymentResult.paymentIntentId);
        setShowDemoPayment(true);
        
        // In a real implementation, you would integrate with Stripe Elements here
        // For demo purposes, we'll show a simulated payment flow
      } else {
        setPaymentError(paymentResult.error || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      setPaymentError('Payment service unavailable. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoPayment = async (paid: boolean) => {
    if (!paymentIntentId) return;

    setIsProcessing(true);

    if (paid) {
      // Simulate successful payment by updating the payment intent ID
      const paidPaymentIntentId = paymentIntentId.replace('pi_mock_', 'pi_mock_demo_paid_');
      
      try {
        // Verify payment status
        const verification = await paymentService.verifyPaymentStatus(paidPaymentIntentId);
        
        if (verification.paid) {
          onPaymentSuccess();
        } else {
          setPaymentError('Payment verification failed. Please try again.');
        }
      } catch (error) {
        setPaymentError('Payment verification error. Please try again.');
      }
    } else {
      // User cancelled payment
      onPaymentCancel();
    }

    setIsProcessing(false);
  };

  if (showDemoPayment && paymentIntentId) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Demo Payment Processing
              </h3>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Demo Mode:</strong> This is a simulated payment flow for demonstration purposes.
                No real money will be charged.
              </p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Certificate:</span>
                <span className="text-sm text-gray-900">{certificateNumber}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Service:</span>
                <span className="text-sm text-gray-900">Blockchain Verification</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Amount:</span>
                <span className="text-sm font-bold text-gray-900">{cost.displayAmount}</span>
              </div>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{paymentError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleDemoPayment(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDemoPayment(true)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Pay $1.00 (Demo)'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-blue-900">
            Blockchain Verification Required
          </h3>
          <div className="mt-2 text-sm text-blue-800">
            <p className="mb-3">
              To access the complete blockchain verification results for certificate <strong>{certificateNumber}</strong>, 
              a verification fee of <strong>{cost.displayAmount}</strong> is required.
            </p>
            <div className="mb-3">
              <p className="font-medium mb-1">This verification includes:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Live Tezos blockchain verification</li>
                <li>Live Etherlink blockchain verification</li>
                <li>IPFS document hash verification</li>
                <li>Complete certificate authenticity report</li>
              </ul>
            </div>
          </div>
          
          {paymentError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{paymentError}</p>
            </div>
          )}

          <div className="mt-4 flex space-x-3">
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Pay ${cost.displayAmount} to Verify`
              )}
            </button>
            <button
              onClick={onPaymentCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}