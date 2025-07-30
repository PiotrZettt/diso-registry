// API route for creating user invitations
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth-service';
import { getTenantFromRequest } from '@/lib/middleware/tenant-resolver';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get current user from auth token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await authService.verifyToken(token);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check permissions (only admins can invite users)
    if (!currentUser.permissions.includes('users.invite')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['tenant_admin', 'certification_body', 'auditor', 'operator', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Create invitation
    const result = await authService.createInvitation(
      tenant.id,
      email,
      role,
      currentUser.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // TODO: Send invitation email here
    // await emailService.sendInvitation(result.invitation);

    return NextResponse.json({
      message: result.message,
      invitation: {
        id: result.invitation!.id,
        email: result.invitation!.email,
        role: result.invitation!.role,
        expiresAt: result.invitation!.expiresAt,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${result.invitation!.token}`,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Invitation creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
