// Simplified Registration API for Testing
// Only requires email, firstName, password, and passwordConfirmation

import { NextRequest, NextResponse } from 'next/server';
import { CertificationBodyAuthService, SimpleRegisterData } from '@/services/certification-body-auth-service';

// Force Node.js runtime for crypto operations
export const runtime = 'nodejs';

const authService = new CertificationBodyAuthService();

export async function POST(request: NextRequest) {
  try {
    const body: SimpleRegisterData = await request.json();

    // Validate required fields
    if (!body.email || !body.firstName || !body.password || !body.passwordConfirmation) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields', 
          message: 'Email, first name, password, and password confirmation are required' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format', 
          message: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
    }

    // Validate password strength (basic)
    if (body.password.length < 8) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Weak password', 
          message: 'Password must be at least 8 characters long' 
        },
        { status: 400 }
      );
    }

    // Validate password confirmation
    if (body.password !== body.passwordConfirmation) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password mismatch', 
          message: 'Password confirmation does not match' 
        },
        { status: 400 }
      );
    }

    // Validate first name (basic)
    if (body.firstName.trim().length < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid first name', 
          message: 'First name must be at least 2 characters long' 
        },
        { status: 400 }
      );
    }

    // Register certification body
    const result = await authService.simpleRegister(body);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error) {
    console.error('Simple registration API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed', 
        message: 'An unexpected error occurred during registration' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed', 
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}
