import { NextRequest, NextResponse } from 'next/server';
import { CertificateService } from '@/services/certificate-service';
import { blockchainService } from '@/services/blockchain-service';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';


/**
 * POST /api/certificates/issue - Issue a new certificate
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication - any logged in user can issue certificates
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in to issue certificates' },
        { status: 401 }
      );
    }

    const user = await certificationBodyAuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or expired token' },
        { status: 401 }
      );
    }

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
      issuerName: `${user.firstName} ${user.lastName}`,
      issuerCode: user.id, // Use user ID as issuer code
      certificationBodyId: user.id, // Link to certification body
      issuedByUserId: user.id, // Track which user issued this
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
      certificationBodyContact: certificationBodyContact || user.email,
      documents,
      metadata: {
        ...metadata,
        createdBy: user.id,
        lastUpdatedBy: user.id,
      },
    };

    console.log('🚀 Creating certificate for user:', user.email);
    console.log('📋 Certificate data preview:', {
      organizationName: certificateData.organization.name,
      certificateNumber: 'will-be-generated',
      issuedBy: certificateData.issuerName
    });
    
    // For now, use a fallback tenant ID since we're removing multi-tenancy
    const certificate = await certificateService.createCertificate(
      'global', // Use 'global' as the single tenant ID
      certificateData
    );

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
