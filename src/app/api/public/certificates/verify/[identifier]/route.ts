// Public API route for certificate verification (no authentication required)
import { NextRequest, NextResponse } from 'next/server';
import { publicCertificateService } from '@/services/public-certificate-service';
import { blockchainService } from '@/services/blockchain-service';
import { ipfsService } from '@/services/ipfs-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'certificate_number';

    let certificate = null;

    if (type === 'certificate_number') {
      certificate = await publicCertificateService.getCertificateByNumber(identifier);
    } else if (type === 'verification_code') {
      certificate = await publicCertificateService.verifyCertificate(identifier);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid verification type. Use "certificate_number" or "verification_code"',
        },
        { status: 400 }
      );
    }

    if (!certificate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate not found',
          message: 'No certificate found with the provided identifier',
        },
        { status: 404 }
      );
    }

    // Perform live blockchain verification
    let blockchainVerification = null;
    try {
      blockchainVerification = await blockchainService.verifyCertificate(certificate.id);
    } catch (error) {
      console.warn('Blockchain verification failed, falling back to database:', error);
    }

    // Perform IPFS verification if blockchain verification found an IPFS hash
    let ipfsVerification = null;
    if (blockchainVerification?.onChainData?.ipfsHash) {
      try {
        const ipfsResult = await ipfsService.verifyCertificateIntegrity(
          blockchainVerification.onChainData.ipfsHash,
          certificate
        );
        ipfsVerification = {
          verified: ipfsResult.valid && ipfsResult.matches,
          accessible: ipfsResult.valid,
          dataMatches: ipfsResult.matches,
          error: ipfsResult.error,
        };
      } catch (error) {
        console.warn('IPFS verification failed:', error);
        ipfsVerification = {
          verified: false,
          accessible: false,
          dataMatches: false,
          error: 'IPFS verification service unavailable',
        };
      }
    }

    // Add verification status with blockchain data
    const verificationResult = {
      ...certificate,
      verification: {
        isValid: certificate.status === 'valid' && !certificate.isExpired,
        status: certificate.isExpired ? 'expired' : certificate.status,
        verifiedAt: new Date().toISOString(),
        message: certificate.isExpired 
          ? 'Certificate has expired'
          : certificate.status === 'valid'
          ? 'Certificate is valid and active'
          : `Certificate status: ${certificate.status}`,
        blockchain: {
          verified: blockchainVerification?.isValid || false,
          etherlinkVerified: blockchainVerification?.etherlinkVerified || false,
          onChainData: blockchainVerification?.onChainData,
          message: blockchainVerification ? 
            (blockchainVerification.isValid ? 'Etherlink blockchain verification successful' : 'Certificate not found on blockchain') :
            'Blockchain verification unavailable - service may be offline',
        },
        ipfs: ipfsVerification ? {
          verified: ipfsVerification.verified,
          accessible: ipfsVerification.accessible,
          dataMatches: ipfsVerification.dataMatches,
          message: ipfsVerification.verified ? 
            'Certificate document verified on IPFS' : 
            (ipfsVerification.error || 'IPFS verification failed'),
        } : blockchainVerification?.onChainData?.ipfsHash ? {
          verified: false,
          accessible: false,
          dataMatches: false,
          message: 'IPFS verification not performed',
        } : {
          verified: false,
          accessible: false,
          dataMatches: false,
          message: 'No IPFS hash found on blockchain',
        },
      },
    };

    return NextResponse.json({
      success: true,
      data: verificationResult,
      message: 'Certificate verification completed',
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed',
      },
      { status: 500 }
    );
  }
}
