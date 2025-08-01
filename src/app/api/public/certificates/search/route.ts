// Public API route for certificate search (no authentication required)
import { NextRequest, NextResponse } from 'next/server';
import { publicCertificateService } from '@/services/public-certificate-service';

/**
 * Recursively convert all Set objects to arrays for Next.js serialization
 */
function convertSetsToArrays(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Set) {
    return Array.from(obj).map(convertSetsToArrays);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertSetsToArrays);
  }
  
  // This handles generic objects
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = convertSetsToArrays(obj[key]);
    }
  }
  return newObj;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = {
      certificateNumber: searchParams.get('certificateNumber') || undefined,
      organizationName: searchParams.get('organizationName') || undefined,
      standard: searchParams.get('standard') || undefined,
      country: searchParams.get('country') || undefined,
      status: searchParams.get('status') as 'valid' | 'expired' | 'suspended' | 'revoked' || undefined,
      issuedAfter: searchParams.get('issuedAfter') ? new Date(searchParams.get('issuedAfter')!) : undefined,
      issuedBefore: searchParams.get('issuedBefore') ? new Date(searchParams.get('issuedBefore')!) : undefined,
      expiryAfter: searchParams.get('expiryAfter') ? new Date(searchParams.get('expiryAfter')!) : undefined,
      expiryBefore: searchParams.get('expiryBefore') ? new Date(searchParams.get('expiryBefore')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Remove undefined values
    Object.keys(query).forEach(key => {
      if (query[key as keyof typeof query] === undefined) {
        delete query[key as keyof typeof query];
      }
    });

    const result = await publicCertificateService.searchCertificates(query);
    
    // Sanitize the result to ensure no Set objects are returned
    const sanitizedResult = convertSetsToArrays(result);

    return NextResponse.json({
      success: true,
      data: sanitizedResult,
      message: 'Search completed',
    });

  } catch (error) {
    console.error('Certificate search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const query = {
      certificateNumber: body.certificateNumber || undefined,
      organizationName: body.organizationName || undefined,
      standard: body.standard || undefined,
      country: body.country || undefined,
      status: body.status || undefined,
      issuedAfter: body.issuedAfter ? new Date(body.issuedAfter) : undefined,
      issuedBefore: body.issuedBefore ? new Date(body.issuedBefore) : undefined,
      expiryAfter: body.expiryAfter ? new Date(body.expiryAfter) : undefined,
      expiryBefore: body.expiryBefore ? new Date(body.expiryBefore) : undefined,
      limit: body.limit || 50,
    };

    // Remove undefined values
    Object.keys(query).forEach(key => {
      if (query[key as keyof typeof query] === undefined) {
        delete query[key as keyof typeof query];
      }
    });

    const result = await publicCertificateService.searchCertificates(query);
    
    // Sanitize the result to ensure no Set objects are returned
    const sanitizedResult = convertSetsToArrays(result);

    return NextResponse.json({
      success: true,
      data: sanitizedResult,
      message: 'Search completed successfully',
    });

  } catch (error) {
    console.error('Certificate search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
      },
      { status: 500 }
    );
  }
}