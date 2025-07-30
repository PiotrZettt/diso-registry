// API endpoint for verifying payment status before showing verification results
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing paymentIntentId parameter',
        },
        { status: 400 }
      );
    }

    // For development/demo purposes, we'll simulate payment verification
    // In production, you would use:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Simulate payment verification based on payment intent ID pattern
    let simulatedStatus = 'requires_payment_method';
    
    // If the payment intent ID contains "paid" or is older than 5 minutes, consider it paid
    // This is just for demo purposes
    if (paymentIntentId.includes('paid') || paymentIntentId.includes('demo_paid')) {
      simulatedStatus = 'succeeded';
    } else {
      // For demo, we'll say payments older than 2 minutes are "paid"
      const timestamp = paymentIntentId.match(/pi_mock_(\d+)_/);
      if (timestamp) {
        const createdTime = parseInt(timestamp[1]);
        const now = Date.now();
        const ageMinutes = (now - createdTime) / (1000 * 60);
        
        if (ageMinutes > 2) { // Consider "paid" after 2 minutes for demo
          simulatedStatus = 'succeeded';
        }
      }
    }

    return NextResponse.json({
      success: true,
      paymentIntentId,
      status: simulatedStatus,
      paid: simulatedStatus === 'succeeded',
      message: simulatedStatus === 'succeeded' 
        ? 'Payment verified successfully'
        : 'Payment is still processing or incomplete',
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify payment status',
      },
      { status: 500 }
    );
  }
}