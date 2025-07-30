// API route for getting current user info
import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.contactPerson.firstName,
        lastName: user.contactPerson.lastName,
        role: 'certification_body' as const,
        status: user.status,
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
          title: user.contactPerson.title,
          phone: user.contactPerson.phone,
          department: 'Quality Management',
        },
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Additional certification body specific data
        certificationBody: user,
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
