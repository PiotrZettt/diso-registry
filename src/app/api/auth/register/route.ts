// API route for certification body registration
import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';

// Force this API route to use Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      accreditationNumber,
      country,
      website,
      contactPerson,
      address,
      accreditation,
    } = body;

    // Validate required fields
    if (!name || !email || !password || !accreditationNumber || !country || !contactPerson || !address || !accreditation) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate contact person required fields
    if (!contactPerson.firstName || !contactPerson.lastName || !contactPerson.title) {
      return NextResponse.json(
        { error: 'Contact person details are required' },
        { status: 400 }
      );
    }

    // Validate address required fields
    if (!address.street || !address.city || !address.state || !address.postalCode) {
      return NextResponse.json(
        { error: 'Complete address is required' },
        { status: 400 }
      );
    }

    // Validate accreditation required fields
    if (!accreditation.accreditationBody || !accreditation.scope || !accreditation.validUntil) {
      return NextResponse.json(
        { error: 'Accreditation details are required' },
        { status: 400 }
      );
    }

    // Register certification body
    const result = await certificationBodyAuthService.register({
      name,
      email,
      password,
      accreditationNumber,
      country,
      website,
      contactPerson,
      address,
      accreditation,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Your account is pending approval.',
      certificationBody: result.certificationBody,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
