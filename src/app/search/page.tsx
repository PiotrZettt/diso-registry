'use client';

import { useState, useEffect, Suspense } from 'react';
import { PublicCertificate } from '@/services/public-certificate-service';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

interface SearchFilters {
  certificateNumber: string;
  organizationName: string;
  standard: string;
  country: string;
  status: 'valid' | 'expired' | 'suspended' | 'revoked' | '';
}

function SearchPageContent() {
  // Default branding for single-tenant app
  const primaryColor = '#2563eb'; // Blue
  const secondaryColor = '#1e40af';
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    certificateNumber: searchParams.get('certificateNumber') || '',
    organizationName: searchParams.get('organizationName') || '',
    standard: searchParams.get('standard') || '',
    country: searchParams.get('country') || '',
    status: (searchParams.get('status') as 'valid' | 'expired' | 'suspended' | 'revoked') || '',
  });
  const [certificates, setCertificates] = useState<PublicCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  // Auto-search if URL parameters are present
  useEffect(() => {
    const hasParams = Object.values(filters).some(value => value !== '');
    if (hasParams) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/public/certificates/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setCertificates(data.data.certificates);
        setTotal(data.data.total);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusColor = (status: string, isExpired: boolean) => {
    if (isExpired) return 'bg-red-100 text-red-800';
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Logo variant="full" size="small" />
            </Link>
            <nav className="flex space-x-8">
              <Link href="/search" className="text-blue-600 hover:text-blue-800 font-medium">
                Search
              </Link>
              <Link href="/verify" className="text-muted-foreground hover:text-card-foreground">
                Verify
              </Link>
              <Link href="/login" className="text-muted-foreground hover:text-card-foreground">
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-card-foreground">Search Certificates</h1>
          <p className="mt-2 text-muted-foreground">
            Find ISO certificates issued by certified bodies worldwide
          </p>
        </div>

        {/* Search Filters */}
        <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Certificate Number
              </label>
              <input
                type="text"
                value={filters.certificateNumber}
                onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500 bg-background"
                placeholder="e.g., ISO-9001-2023-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={filters.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500 bg-background"
                placeholder="e.g., Acme Corporation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                ISO Standard
              </label>
              <input
                type="text"
                value={filters.standard}
                onChange={(e) => handleInputChange('standard', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500 bg-background"
                placeholder="e.g., ISO 9001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Country
              </label>
              <input
                type="text"
                value={filters.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500 bg-background"
                placeholder="e.g., United States"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500 bg-background"
              >
                <option value="">All Statuses</option>
                <option value="valid">Valid</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {certificates.length > 0 && (
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-medium text-card-foreground">
                Search Results ({total} certificate{total !== 1 ? 's' : ''})
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-6 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h4 className="text-lg font-medium text-card-foreground mr-4">
                          {cert.organization.name}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(cert.status, cert.isExpired)}`}>
                          {cert.isExpired ? 'Expired' : cert.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Certificate:</span> {cert.certificateNumber}
                        </div>
                        <div>
                          <span className="font-medium">Standard:</span> {cert.standard.number} - {cert.standard.title}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {cert.organization.city}, {cert.organization.country}
                        </div>
                        <div>
                          <span className="font-medium">Issued:</span> {new Date(cert.issuedDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {new Date(cert.expiryDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Issuer:</span> {cert.issuerName}
                        </div>
                      </div>

                      {cert.scope.description && (
                        <div className="mt-3">
                          <span className="font-medium text-sm text-muted-foreground">Scope:</span>
                          <p className="text-sm text-muted-foreground mt-1">{cert.scope.description}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <Button variant={'outline'} size="lg" className="border-green-500">
                        <Link
                        href={`/verify?id=${cert.certificateNumber}`}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-600 hover:text-green-800"
                      >
                        Verify
                        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                      </Button>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && certificates.length === 0 && total === 0 && (
          <div className="bg-card rounded-lg border shadow-sm p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">No certificates found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or browse all certificates.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading search page...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
