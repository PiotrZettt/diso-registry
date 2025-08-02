// New API route that uses the API Gateway backend instead of direct DynamoDB
import { NextRequest, NextResponse } from 'next/server';
import { certificateServiceAPI } from '@/services/certificate-service-api';
import { authServiceAPI } from '@/services/auth-service-api';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Set token for the API client
    const apiClient = require('@/services/api-client').apiClient;
    apiClient.setAuthToken(authToken);

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const lastKey = searchParams.get('lastKey') || undefined;

    const result = await certificateServiceAPI.getCertificates({ limit, lastKey });

    if (result.success) {
      return NextResponse.json({
        success: true,
        certificates: result.certificates,
        lastEvaluatedKey: result.lastEvaluatedKey,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Get certificates error:', error);
    return NextResponse.json(
      { error: 'Failed to get certificates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Set token for the API client
    const apiClient = require('@/services/api-client').apiClient;
    apiClient.setAuthToken(authToken);

    const body = await request.json();

    const result = await certificateServiceAPI.createCertificate(body);

    if (result.success) {
      return NextResponse.json({
        success: true,
        certificate: result.certificate,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Create certificate error:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
}