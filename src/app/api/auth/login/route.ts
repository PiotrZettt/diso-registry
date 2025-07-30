// API route for certification body login
import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await certificationBodyAuthService.login({ email, password });

    console.log('Login attempt result:', result.success);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }

    // Set HTTP-only cookie with JWT token
    const response = NextResponse.json({
      success: true,
      message: result.message,
      certificationBody: result.certificationBody,
    });

    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    console.log('Cookie set with token length:', result.token?.length);

    // Test if we can read the cookie immediately (for debugging)
    const testCookie = response.cookies.get('auth-token');
    console.log('Cookie read test:', !!testCookie);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
