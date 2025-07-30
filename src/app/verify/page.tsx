'use client';

import { useState, useEffect } from 'react';
import { useTenant, useTenantBranding } from '@/lib/context/tenant-context';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import VerificationPayment from '@/components/payments/VerificationPayment';
import { PaymentService } from '@/services/payment-service';

interface VerificationResult {
  id: string;
  certificateNumber: string;
  issuerName: string;
  organization: {
    name: string;
    country: string;
    city: string;
  };
  standard: {
    number: string;
    title: string;
    category: string;
  };
  issuedDate: string; // Date as string from API
  expiryDate: string; // Date as string from API
  status: string;
  scope: {
    description: string;
    sites: Array<{
      name: string;
      city: string;
      country: string;
    }>;
  };
  verificationCode: string;
  blockchain?: {
    tezosTransactionHash?: string;
    etherlinkTransactionHash?: string;
    ipfsHash?: string;
  };
  isExpired: boolean;
  daysUntilExpiry: number;
  verification: {
    isValid: boolean;
    status: string;
    verifiedAt: string;
    message: string;
    blockchain?: {
      verified: boolean;
      tezosVerified?: boolean;
      etherlinkVerified?: boolean;
      onChainData?: any;
      message?: string;
    };
    ipfs?: {
      verified: boolean;
      accessible: boolean;
      dataMatches: boolean;
      message: string;
    };
  };
}

export default function VerifyPage() {
  const { tenant } = useTenant();
  const { primaryColor } = useTenantBranding();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('id') || '');
  const [verificationType, setVerificationType] = useState<'certificate_number' | 'verification_code'>('certificate_number');
  const [certificate, setCertificate] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    if (searchParams.get('id')) {
      handleVerify();
    }
  }, [searchParams]);

  const handleVerify = async () => {
    if (!identifier.trim()) {
      setError('Please enter a certificate number or verification code');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/public/certificates/verify/${encodeURIComponent(identifier)}?type=${verificationType}`);
      const data = await response.json();

      if (data.success) {
        setCertificate(data.data);
        
        // Check if payment is required for blockchain verification
        if (PaymentService.isPaymentRequired()) {
          setShowPayment(true);
        }
      } else {
        setError(data.error || 'Certificate not found');
        setCertificate(null);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setPaymentCompleted(true);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    // Reset the search state
    setCertificate(null);
    setHasSearched(false);
  };

  const getStatusColor = (status: string, isExpired: boolean) => {
    if (isExpired) return 'bg-red-100 text-red-800 border-red-200';
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'revoked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVerificationIcon = (isValid: boolean) => {
    if (isValid) {
      return (
        <svg className="h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {tenant?.name || 'DeFi ISO Registry'}
              </h1>
            </Link>
            <nav className="flex space-x-8">
              <Link href="/search" className="text-gray-600 hover:text-gray-900">
                Search
              </Link>
              <Link href="/verify" className="text-blue-600 hover:text-blue-800 font-medium">
                Verify
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Verify Certificate</h1>
          <p className="mt-2 text-gray-600">
            Enter a certificate number or verification code to verify its authenticity
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="certificate_number"
                    checked={verificationType === 'certificate_number'}
                    onChange={(e) => setVerificationType(e.target.value as 'certificate_number')}
                    className="mr-2"
                  />
                  Certificate Number
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="verification_code"
                    checked={verificationType === 'verification_code'}
                    onChange={(e) => setVerificationType(e.target.value as 'verification_code')}
                    className="mr-2"
                  />
                  Verification Code
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {verificationType === 'certificate_number' ? 'Certificate Number' : 'Verification Code'}
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder={verificationType === 'certificate_number' ? 'e.g., ISO-9001-2023-001' : 'e.g., ABC123XYZ'}
                />
                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="px-6 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Component */}
        {showPayment && certificate && (
          <VerificationPayment
            certificateId={certificate.id}
            certificateNumber={certificate.certificateNumber}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentCancel={handlePaymentCancel}
          />
        )}

        {/* Verification Result */}
        {certificate && !showPayment && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Verification Status Header */}
            <div className={`px-6 py-4 ${certificate.verification.isValid ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
              <div className="flex items-center">
                {getVerificationIcon(certificate.verification.isValid)}
                <div className="ml-4">
                  <h3 className={`text-2xl font-bold ${certificate.verification.isValid ? 'text-green-800' : 'text-red-800'}`}>
                    {certificate.verification.isValid ? 'Certificate Verified' : 'Certificate Invalid'}
                  </h3>
                  <p className={`text-sm ${certificate.verification.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {certificate.verification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Verified at: {new Date(certificate.verification.verifiedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Certificate Information</h4>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Certificate Number</dt>
                      <dd className="text-gray-900">{certificate.certificateNumber}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Standard</dt>
                      <dd className="text-gray-900">{certificate.standard.number} - {certificate.standard.title}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Category</dt>
                      <dd className="text-gray-900">{certificate.standard.category}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Status</dt>
                      <dd>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(certificate.status, certificate.isExpired)}`}>
                          {certificate.isExpired ? 'Expired' : certificate.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Issued Date</dt>
                      <dd className="text-gray-900">{new Date(certificate.issuedDate).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Expiry Date</dt>
                      <dd className="text-gray-900">{new Date(certificate.expiryDate).toLocaleDateString()}</dd>
                    </div>
                    {!certificate.isExpired && (
                      <div>
                        <dt className="font-medium text-gray-500">Days Until Expiry</dt>
                        <dd className="text-gray-900">{certificate.daysUntilExpiry} days</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h4>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Organization Name</dt>
                      <dd className="text-gray-900">{certificate.organization.name}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Location</dt>
                      <dd className="text-gray-900">{certificate.organization.city}, {certificate.organization.country}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Certification Body</dt>
                      <dd className="text-gray-900">{certificate.issuerName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Verification Code</dt>
                      <dd className="text-gray-900 font-mono">{certificate.verificationCode}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Scope */}
              {certificate.scope.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Scope of Certification</h4>
                  <p className="text-sm text-gray-700">{certificate.scope.description}</p>
                  
                  {certificate.scope.sites && certificate.scope.sites.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Certified Sites</h5>
                      <div className="space-y-2">
                        {certificate.scope.sites.map((site, index) => (
                          <div key={index} className="text-sm text-gray-700">
                            <span className="font-medium">{site.name}</span> - {site.city}, {site.country}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Blockchain Verification Status */}
              {certificate.verification.blockchain && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Live Etherlink Verification</h4>
                    {paymentCompleted && (
                      <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Payment Verified
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-lg border ${certificate.verification.blockchain.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center mb-3">
                      {certificate.verification.blockchain.verified ? (
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className={`font-medium ${certificate.verification.blockchain.verified ? 'text-green-800' : 'text-red-800'}`}>
                        {certificate.verification.blockchain.verified ? 'Blockchain Verification Successful' : 'Blockchain Verification Failed'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Etherlink Blockchain:</span>
                        {certificate.verification.blockchain.etherlinkVerified ? (
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
                            Failed
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">IPFS Document:</span>
                        {certificate.verification.ipfs?.verified ? (
                          <span className="text-green-600 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Verified
                          </span>
                        ) : certificate.verification.ipfs ? (
                          <span className="text-orange-600 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            {certificate.verification.ipfs.accessible ? 'Data Mismatch' : 'Unavailable'}
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            No IPFS Hash
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {(certificate.verification.blockchain.message || certificate.verification.ipfs?.message) && (
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        {certificate.verification.blockchain.message && (
                          <p><strong>Blockchain:</strong> {certificate.verification.blockchain.message}</p>
                        )}
                        {certificate.verification.ipfs?.message && (
                          <p><strong>IPFS:</strong> {certificate.verification.ipfs.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Blockchain Information */}
              {certificate.blockchain && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Blockchain Transaction Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {certificate.blockchain.tezosTransactionHash && (
                      <div>
                        <dt className="font-medium text-gray-500">Tezos Transaction</dt>
                        <dd className="text-gray-900 font-mono break-all">{certificate.blockchain.tezosTransactionHash}</dd>
                      </div>
                    )}
                    {certificate.blockchain.etherlinkTransactionHash && (
                      <div>
                        <dt className="font-medium text-gray-500">Etherlink Transaction</dt>
                        <dd className="text-gray-900 font-mono break-all">{certificate.blockchain.etherlinkTransactionHash}</dd>
                      </div>
                    )}
                    {certificate.blockchain.ipfsHash && (
                      <div>
                        <dt className="font-medium text-gray-500">IPFS Hash</dt>
                        <dd className="text-gray-900 font-mono break-all">{certificate.blockchain.ipfsHash}</dd>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !certificate && hasSearched && !error && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No certificate found</h3>
            <p className="text-gray-600">Please check the certificate number or verification code and try again.</p>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Need Help?</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• <strong>Certificate Number:</strong> Usually found on the certificate document (e.g., ISO-9001-2023-001)</p>
            <p>• <strong>Verification Code:</strong> A short code provided by the certification body for quick verification</p>
            <p>• Contact the certification body directly if you cannot find these details</p>
          </div>
        </div>
      </main>
    </div>
  );
}
