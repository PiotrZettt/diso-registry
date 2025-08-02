// New API route that uses the API Gateway backend instead of direct DynamoDB
import { NextRequest, NextResponse } from 'next/server';
import { authServiceAPI } from '@/services/auth-service-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await authServiceAPI.login({ email, password });

    if (result.success) {
      const response = NextResponse.json({
        success: true,
        user: result.user,
        message: result.message,
      });

      // Set auth token as httpOnly cookie
      if (result.token) {
        response.cookies.set('auth-token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });
      }

      return response;
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}