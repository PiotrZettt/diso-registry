// API route for getting current user info
import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';

/**
 * Recursively convert all Set objects to arrays for Next.js serialization
 */
function convertSetsToArrays(obj: any): any {
  if (obj instanceof Set) {
    return Array.from(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertSetsToArrays(item));
  }
  
  if (obj && typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertSetsToArrays(value);
    }
    return converted;
  }
  
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    // Check for debug mode
    const url = new URL(request.url);
    if (url.searchParams.get('debug') === 'env') {
      return NextResponse.json({
        debug: true,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          AWS_REGION: process.env.AWS_REGION,
          DEFISO_AWS_REGION: process.env.DEFISO_AWS_REGION,
          DEFISO_ACCESS_KEY_ID: process.env.DEFISO_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
          DEFISO_SECRET_ACCESS_KEY: process.env.DEFISO_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
          DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX,
          USE_DYNAMODB: process.env.USE_DYNAMODB,
          hasCredentials: !!(process.env.DEFISO_ACCESS_KEY_ID && process.env.DEFISO_SECRET_ACCESS_KEY),
        }
      });
    }
    
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await certificationBodyAuthService.verifyToken(token);
    
    if (!user) {
      // Clear invalid token
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      
      return response;
    }

    // Sanitize user object to remove any Set objects
    const sanitizedUser = convertSetsToArrays(user);

    return NextResponse.json({
      user: {
        id: sanitizedUser.id,
        email: sanitizedUser.email,
        firstName: sanitizedUser.contactPerson?.firstName,
        lastName: sanitizedUser.contactPerson?.lastName,
        role: 'certification_body' as const,
        status: sanitizedUser.status,
        permissions: ['issue_certificates', 'view_certificates', 'manage_organization'],
        emailVerified: true,
        settings: {
          notifications: {
            email: true,
            certificateExpiry: true,
            auditReminders: true,
          },
          language: 'en',
          timezone: 'UTC',
        },
        profile: {
          title: sanitizedUser.contactPerson?.title,
          phone: sanitizedUser.contactPerson?.phone,
          department: 'Quality Management',
        },
        lastLoginAt: sanitizedUser.lastLoginAt,
        createdAt: sanitizedUser.createdAt,
        updatedAt: sanitizedUser.updatedAt,
        // Additional certification body specific data (sanitized)
        certificationBody: sanitizedUser,
      },
      authenticated: true,
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
