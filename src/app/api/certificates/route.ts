// API route for certificate operations
import { NextRequest, NextResponse } from 'next/server';
import { certificateService } from '@/services/certificate-service';
import { getTenantFromRequest } from '@/lib/middleware/tenant-resolver';

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
    const tenant = await getTenantFromRequest(request);
    
    const { searchParams } = new URL(request.url);
    const certificateNumber = searchParams.get('certificateNumber');
    const organizationName = searchParams.get('organizationName');
    const standard = searchParams.get('standard');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const lastKey = searchParams.get('lastKey');

    if (!tenant) {
      // Use global tenant to match my-certificates API
      const fallbackTenant = { id: 'global', name: 'Global Tenant' };
      
      // Get specific certificate if requested
      if (certificateNumber) {

        const certificate = await certificateService.getCertificate(fallbackTenant.id, certificateNumber);

        if (!certificate) {
          return NextResponse.json(
            { error: 'Certificate not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ certificate: convertSetsToArrays(certificate) });
      }
      
      const result = await certificateService.getCertificatesByTenant(fallbackTenant.id, 50);
      
      return NextResponse.json(convertSetsToArrays({
        ...result,
        debug: { usedFallbackTenant: true, tenantId: fallbackTenant.id }
      }));
    }

    // Get specific certificate
    if (certificateNumber) {

      const certificate = await certificateService.getCertificate(tenant.id, certificateNumber);

      if (!certificate) {
        return NextResponse.json(
          { error: 'Certificate not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ certificate: convertSetsToArrays(certificate) });
    }

    // Search certificates
    if (organizationName || standard || status) {
      const query: any = {};
      if (organizationName) query.organizationName = organizationName;
      if (standard) query.standard = standard;
      if (status) query.status = status as any;

      const certificates = await certificateService.searchCertificates(tenant.id, query, limit);
      return NextResponse.json({ certificates: convertSetsToArrays(certificates) });
    }

    // Get all certificates for tenant
    const result = await certificateService.getCertificatesByTenant(tenant.id, limit, lastKey || undefined);
    return NextResponse.json(convertSetsToArrays(result));

  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'issuerName',
      'issuerCode',
      'organization',
      'standard',
      'issuedDate',
      'expiryDate',
      'auditInfo',
      'scope'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Convert date strings to Date objects
    const certificateData = {
      ...body,
      issuedDate: new Date(body.issuedDate),
      expiryDate: new Date(body.expiryDate),
      auditInfo: {
        ...body.auditInfo,
        auditDate: new Date(body.auditInfo.auditDate),
        nextAuditDate: body.auditInfo.nextAuditDate ? new Date(body.auditInfo.nextAuditDate) : undefined,
      },
      status: body.status || 'valid',
      metadata: {
        ...body.metadata,
        createdBy: 'system', // TODO: Get from auth context
        lastUpdatedBy: 'system',
        publiclySearchable: body.metadata?.publiclySearchable || true,
        verificationCode: Math.random().toString(36).substring(2, 15),
        tags: body.metadata?.tags || [],
      },
      // Blockchain data will be populated by certificate service
      blockchain: {},
      documents: {
        certificateUrl: undefined,
        auditReportUrl: undefined,
        supportingDocuments: [],
      },
    };

    const certificate = await certificateService.createCertificate(tenant.id, certificateData);
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Certificate created successfully',
        data: certificate 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { certificateNumber, status, reason } = body;

    if (!certificateNumber || !status) {
      return NextResponse.json(
        { error: 'Certificate number and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['valid', 'expired', 'suspended', 'revoked', 'pending', 'draft'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updatedCertificate = await certificateService.updateCertificateStatus(
      tenant.id,
      certificateNumber,
      status,
      reason
    );

    if (!updatedCertificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Certificate status updated successfully',
      certificate: convertSetsToArrays(updatedCertificate)
    });

  } catch (error) {
    console.error('Error updating certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const certificateNumber = searchParams.get('certificateNumber');

    if (!certificateNumber) {
      return NextResponse.json(
        { error: 'Certificate number is required' },
        { status: 400 }
      );
    }

    const success = await certificateService.deleteCertificate(tenant.id, certificateNumber);

    if (!success) {
      return NextResponse.json(
        { error: 'Certificate not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Certificate deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
