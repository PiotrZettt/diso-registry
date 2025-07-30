// Test auth API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body;
    
    console.log('Test auth received:', { action, email, hasPassword: !!password });

    if (action === 'test-login') {
      console.log('Testing login with:', email);
      const result = await certificationBodyAuthService.login({ email, password });
      console.log('Login result:', result.success, result.message);
      
      if (result.success && result.token) {
        console.log('Token length:', result.token.length);
        
        // Test token verification immediately
        const verifyResult = await certificationBodyAuthService.verifyToken(result.token);
        console.log('Token verification result:', !!verifyResult);
        
        return NextResponse.json({
          loginSuccess: result.success,
          tokenLength: result.token.length,
          verifySuccess: !!verifyResult,
          userEmail: verifyResult?.email
        });
      } else {
        return NextResponse.json({
          loginSuccess: result.success,
          message: result.message
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
