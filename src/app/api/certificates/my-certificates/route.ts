import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';
import { certificateService } from '@/services/certificate-service';

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
    // Get authenticated user
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await certificationBodyAuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status') || '';

    // Get all certificates for the tenant, then filter by user
    console.log('Fetching certificates for user:', user.id, 'tenantId: global');
    const tenantCertificates = await certificateService.getCertificatesByTenant('global', 100);
    console.log('Found', tenantCertificates.certificates.length, 'total certificates in tenant');
    
    // Filter certificates by the user who issued them
    const userCertificates = tenantCertificates.certificates.filter(cert => cert.issuedByUserId === user.id);
    console.log('Found', userCertificates.length, 'certificates issued by user:', user.id);
    
    // Apply status filter if provided
    const filteredCertificates = status 
      ? userCertificates.filter(cert => cert.status === status)
      : userCertificates;
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedCertificates = filteredCertificates.slice(startIndex, startIndex + limit);
    
    // Convert any remaining Sets to arrays before returning
    const sanitizedCertificates = paginatedCertificates.map(cert => convertSetsToArrays(cert));
    
    const results = {
      certificates: sanitizedCertificates,
      total: filteredCertificates.length,
      page,
      limit
    };

    return NextResponse.json({
      success: true,
      data: {
        certificates: results.certificates,
        total: results.total,
        page: results.page,
        limit: results.limit,
        totalPages: Math.ceil(results.total / results.limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}