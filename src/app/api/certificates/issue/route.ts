import { NextRequest, NextResponse } from 'next/server';
import { CertificateService } from '@/services/certificate-service';
import { blockchainService } from '@/services/blockchain-service';
import { getTenantFromRequest } from '@/lib/middleware/tenant-resolver';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';

/**
 * Helper function to extract and verify JWT from request
 */
async function verifyAuthFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token) {
    return { success: false, user: null };
  }

  const user = await certificationBodyAuthService.verifyToken(token);
  return { success: !!user, user };
}

/**
 * POST /api/certificates/issue - Issue a new certificate
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication (DISABLED FOR TESTING)
    // const authResult = await verifyAuthFromRequest(request);
    // if (!authResult.success || !authResult.user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized - only certification bodies can issue certificates' },
    //     { status: 401 }
    //   );
    // }

    // Mock user for testing
    const authResult = {
      success: true,
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        accreditationNumber: 'TCB-001',
        certificationBody: {
          name: 'Test Certification Body',
          code: 'TCB',
        },
        tenantId: 'test-tenant',
      },
    };

    // 2. Get tenant context (MOCKED FOR TESTING)
    // const tenant = await getTenantFromRequest(request);
    // if (!tenant) {
    //   return NextResponse.json(
    //     { error: 'Tenant context required' },
    //     { status: 400 }
    //   );
    // }

    // Mock tenant for testing
    const tenant = {
      id: 'test-tenant',
      name: 'Test Tenant',
    };

    // 3. Parse and validate request body
    const body = await request.json();
    const {
      organization,
      standard,
      scope,
      expiryDate,
      auditor,
      certificationBodyContact,
      documents = [],
      metadata = {}
    } = body;

    // Basic validation
    if (!organization?.name || !standard?.number || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: organization.name, standard.number, expiryDate' },
        { status: 400 }
      );
    }

    // Validate expiry date
    const expiry = new Date(expiryDate);
    if (expiry <= new Date()) {
      return NextResponse.json(
        { error: 'Expiry date must be in the future' },
        { status: 400 }
      );
    }

    // 4. Create certificate with blockchain integration
    const certificateService = new CertificateService();
    
    const certificateData = {
      organization: {
        name: organization.name,
        address: organization.address || '',
        website: organization.website || '',
        contactPerson: organization.contactPerson || '',
        contactEmail: organization.contactEmail || '',
        contactPhone: organization.contactPhone || '',
      },
      standard: {
        number: standard.number,
        title: standard.title || `ISO ${standard.number}`,
        version: standard.version || '2024',
        category: standard.category || 'quality' as const,
      },
      scope: scope || '',
      status: 'valid' as const,
      issuedDate: new Date(),
      expiryDate: expiry,
      // Add required fields for ISOCertificate type
      issuerName: authResult.user.name,
      issuerCode: authResult.user.accreditationNumber || '',
      auditInfo: {
        auditDate: new Date(),
        auditorName: auditor?.name || 'Not specified',
        auditType: 'initial' as const,
        nextAuditDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
      blockchain: {
        tezosHash: undefined,
        etherlinkHash: undefined,
        ipfsHash: undefined,
      },
      certificationBodyContact: certificationBodyContact || authResult.user.email,
      documents,
      metadata,
    };

    console.log('🚀 Creating certificate with tenant ID:', tenant.id);
    console.log('📋 Certificate data preview:', {
      organizationName: certificateData.organization.name,
      certificateNumber: 'will-be-generated',
      publiclySearchable: certificateData.metadata.publiclySearchable
    });
    
    const certificate = await certificateService.createCertificate(
      tenant.id,
      certificateData
    );
    
    console.log('✅ Certificate created successfully:', {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      tenantId: certificate.tenantId,
      publiclySearchable: certificate.metadata?.publiclySearchable,
      blockchainHash: certificate.blockchain?.etherlinkHash
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        organization: certificate.organization.name,
        standard: certificate.standard.number,
        status: certificate.status,
        issuedDate: certificate.issuedDate,
        expiryDate: certificate.expiryDate,
        blockchain: certificate.blockchain,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Certificate issuance error:', error);
    return NextResponse.json(
      { 
        error: 'Certificate issuance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
