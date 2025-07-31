import { NextRequest, NextResponse } from 'next/server';
import { certificationBodyAuthService } from '@/services/certification-body-auth-service';
import { certificateService } from '@/services/certificate-service';

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

    // Get all certificates for the tenant, then filter by user
    const tenantCertificates = await certificateService.getCertificatesByTenant('global', 1000);
    
    // Filter certificates by the user who issued them
    const userCertificates = tenantCertificates.certificates.filter(cert => cert.issuedByUserId === user.id);
    
    // Calculate statistics
    const totalCertificates = userCertificates.length;
    const activeCertificates = userCertificates.filter(cert => cert.status === 'valid' && new Date(cert.expiryDate) > new Date()).length;
    const expiredCertificates = userCertificates.filter(cert => new Date(cert.expiryDate) <= new Date()).length;
    const revokedCertificates = userCertificates.filter(cert => cert.status === 'revoked').length;
    const suspendedCertificates = userCertificates.filter(cert => cert.status === 'suspended').length;
    
    // Calculate certificates issued this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const certificatesThisMonth = userCertificates.filter(cert => 
      new Date(cert.issuedDate) >= startOfMonth
    ).length;

    // Calculate certificates expiring in next 30 days
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    const expiringCertificates = userCertificates.filter(cert => 
      cert.status === 'valid' && 
      new Date(cert.expiryDate) > new Date() && 
      new Date(cert.expiryDate) <= next30Days
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        totalCertificates,
        activeCertificates,
        expiredCertificates,
        revokedCertificates,
        suspendedCertificates,
        certificatesThisMonth,
        expiringCertificates
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}