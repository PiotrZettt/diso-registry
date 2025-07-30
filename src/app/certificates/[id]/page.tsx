'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CertificateDetail {
  id: string;
  organizationName: string;
  organizationEmail: string;
  certificateType: string;
  status: 'active' | 'expired' | 'revoked';
  issuedDate: string;
  expiryDate: string;
  scope: string;
  additionalInfo?: string;
  issuer: string;
  blockchainHash?: string;
}

interface BlockchainVerificationResult {
  verified: boolean;
  tezosVerified: boolean;
  etherlinkVerified: boolean;
  onChainData?: any;
  message?: string;
}

export default function CertificateDetailPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockchainVerification, setBlockchainVerification] = useState<BlockchainVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleBlockchainVerification = async () => {
    if (!certificate) return;
    
    setIsVerifying(true);
    setShowVerificationModal(true);
    
    try {
      // Use the certificate ID directly as the certificate number for verification
      const certificateNumber = certificate.id;
      
      const response = await fetch(`/api/public/certificates/verify/${encodeURIComponent(certificateNumber)}?type=certificate_number`);
      const data = await response.json();
      
      if (data.success && data.data.verification.blockchain) {
        setBlockchainVerification(data.data.verification.blockchain);
      } else {
        // If certificate not found in database, try direct blockchain verification
        setBlockchainVerification({
          verified: false,
          tezosVerified: false,
          etherlinkVerified: false,
          message: 'Certificate not found in public registry. This may be a private certificate.'
        });
      }
    } catch (error) {
      console.error('Blockchain verification failed:', error);
      setBlockchainVerification({
        verified: false,
        tezosVerified: false,
        etherlinkVerified: false,
        message: 'Blockchain verification service is currently unavailable.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // TODO: Fetch certificate details from API
    // For now, showing mock data
    setTimeout(() => {
      const mockCertificate: CertificateDetail = {
        id: params.id,
        organizationName: params.id === 'TEST-BLOCKCHAIN-001' ? 'Test Organization Ltd' : 'Acme Corporation',
        organizationEmail: params.id === 'TEST-BLOCKCHAIN-001' ? 'test@testorg.com' : 'quality@acme.com',
        certificateType: 'ISO 9001',
        status: 'active',
        issuedDate: '2024-01-15',
        expiryDate: '2027-01-15',
        scope: params.id === 'TEST-BLOCKCHAIN-001' 
          ? 'Design, manufacture and supply of test products'
          : 'Design, development, and manufacture of quality management systems for industrial automation equipment.',
        additionalInfo: params.id === 'TEST-BLOCKCHAIN-001' 
          ? 'This is a test certificate for demonstrating blockchain verification.'
          : 'Certificate includes surveillance audits scheduled annually.',
        issuer: (user as any)?.certificationBody?.name || 'Test Certification Body',
        blockchainHash: params.id === 'TEST-BLOCKCHAIN-001'
          ? 'oo7Uuq1K6Z9e3x4B2h5Y8p1A9n6F3d2W5r7T9m4N8k3L'
          : '0x1a2b3c4d5e6f7890abcdef1234567890fedcba0987654321',
      };
      setCertificate(mockCertificate);
      setIsLoading(false);
    }, 1000);
  }, [params.id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex px-3 py-1 text-sm font-semibold rounded-full";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'expired':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'revoked':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Certificate Details</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Print
              </button>
              <button
                onClick={() => alert('Export functionality coming soon!')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading certificate...</span>
            </div>
          ) : !certificate ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">Certificate not found</h3>
              <p className="mt-1 text-sm text-gray-500">The requested certificate could not be found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Certificate Header */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{certificate.organizationName}</h2>
                      <p className="text-sm text-gray-500">Certificate #{certificate.id}</p>
                    </div>
                    <span className={getStatusBadge(certificate.status)}>
                      {certificate.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Certificate Information
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Certificate Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{certificate.certificateType}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Organization Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{certificate.organizationEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Issued Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(certificate.issuedDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(certificate.expiryDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Issued By</dt>
                      <dd className="mt-1 text-sm text-gray-900">{certificate.issuer}</dd>
                    </div>
                    {certificate.blockchainHash && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Blockchain Hash</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">
                          {certificate.blockchainHash}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Scope */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Scope of Certification
                  </h3>
                  <p className="text-sm text-gray-900">{certificate.scope}</p>
                </div>
              </div>

              {/* Additional Information */}
              {certificate.additionalInfo && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Additional Information
                    </h3>
                    <p className="text-sm text-gray-900">{certificate.additionalInfo}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Certificate Actions
                  </h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleBlockchainVerification}
                      disabled={isVerifying}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </>
                      ) : (
                        'Verify on Blockchain'
                      )}
                    </button>
                    <button
                      onClick={() => alert('Amendment functionality coming soon!')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Amend Certificate
                    </button>
                    {certificate.status === 'active' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to revoke this certificate?')) {
                            alert('Revocation functionality coming soon!');
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Revoke Certificate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Blockchain Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Blockchain Verification Results
                </h3>
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isVerifying ? (
                <div className="text-center py-4">
                  <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Verifying certificate on blockchain...</p>
                </div>
              ) : blockchainVerification ? (
                <div>
                  <div className={`p-4 rounded-lg border mb-4 ${blockchainVerification.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center mb-3">
                      {blockchainVerification.verified ? (
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className={`font-medium ${blockchainVerification.verified ? 'text-green-800' : 'text-red-800'}`}>
                        {blockchainVerification.verified ? 'Certificate Verified on Blockchain' : 'Certificate Not Found on Blockchain'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Tezos:</span>
                        {blockchainVerification.tezosVerified ? (
                          <span className="text-green-600 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Not Found
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Etherlink:</span>
                        {blockchainVerification.etherlinkVerified ? (
                          <span className="text-green-600 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Not Found
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {blockchainVerification.message && (
                      <p className="text-sm text-gray-600">{blockchainVerification.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowVerificationModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => window.open('/verify', '_blank')}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      View Public Verification
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
