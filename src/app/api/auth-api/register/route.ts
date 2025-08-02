// New API route that uses the API Gateway backend instead of direct DynamoDB
import { NextRequest, NextResponse } from 'next/server';
import { authServiceAPI } from '@/services/auth-service-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, role } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await authServiceAPI.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}