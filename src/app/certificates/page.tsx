'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Certificate {
  id: string;
  organizationName: string;
  certificateType: string;
  status: 'active' | 'expired' | 'revoked';
  issuedDate: string;
  expiryDate: string;
  scope: string;
}

export default function CertificatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // TODO: Fetch certificates from API
    // For now, showing mock data
    setTimeout(() => {
      setCertificates([
        {
          id: 'CERT-001',
          organizationName: 'Acme Corporation',
          certificateType: 'ISO 9001',
          status: 'active',
          issuedDate: '2024-01-15',
          expiryDate: '2027-01-15',
          scope: 'Design, development, and manufacture of quality management systems',
        },
        {
          id: 'CERT-002',
          organizationName: 'TechFlow Solutions',
          certificateType: 'ISO 27001',
          status: 'active',
          issuedDate: '2024-02-10',
          expiryDate: '2027-02-10',
          scope: 'Information security management for software development services',
        },
        {
          id: 'CERT-003',
          organizationName: 'Green Energy Ltd',
          certificateType: 'ISO 14001',
          status: 'expired',
          issuedDate: '2021-03-20',
          expiryDate: '2024-03-20',
          scope: 'Environmental management in renewable energy operations',
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

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
    const baseClasses = "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
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
              <h1 className="text-xl font-semibold text-gray-900">Certificates</h1>
            </div>
            <button
              onClick={() => router.push('/certificates/issue')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Issue New Certificate
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading certificates...</span>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No certificates</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by issuing your first certificate.</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/certificates/issue')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Issue New Certificate
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {certificates.map((certificate) => (
                  <li key={certificate.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">{certificate.organizationName}</p>
                              <span className="ml-2 text-sm text-gray-500">#{certificate.id}</span>
                            </div>
                            <div className="mt-1">
                              <p className="text-sm text-gray-600">{certificate.certificateType}</p>
                              <p className="text-xs text-gray-500 mt-1">{certificate.scope}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Issued: {new Date(certificate.issuedDate).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500">Expires: {new Date(certificate.expiryDate).toLocaleDateString()}</p>
                          </div>
                          <span className={getStatusBadge(certificate.status)}>
                            {certificate.status}
                          </span>
                          <button
                            onClick={() => router.push(`/certificates/${certificate.id}`)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
