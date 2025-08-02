'use client';

import { useState, useEffect } from "react";
import Link from 'next/link';
import { PublicCertificate } from '@/services/public-certificate-service';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from '@/hooks/useAuth';
import { ColorizedDisoRegistry } from '@/components/ui/ColorizedDiso';

interface SearchFilters {
  certificateNumber: string;
  organizationName: string;
  standard: string;
  country: string;
  status: 'valid' | 'expired' | 'suspended' | 'revoked' | '';
}

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [certificates, setCertificates] = useState<PublicCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchError, setSearchError] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  // Default branding for single-tenant app
  const primaryColor = '#2563eb'; // Blue
  const secondaryColor = '#1e40af';
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearchError('');
    setShowResults(true);
    
    try {
      const params = new URLSearchParams();
      params.append('organizationName', searchQuery.trim());

      const response = await fetch(`/api/public/certificates/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setCertificates(data.data.certificates);
        setTotal(data.data.total);
      } else {
        setSearchError(data.error || 'Search failed');
      }
    } catch (err) {
      setSearchError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            <Logo variant="full" size="small" />
            <nav className="flex space-x-8">
              <Link href={user ? "/dashboard" : "/login"}>
                <Button variant="outline" className="animate-pulse-outline">Certification Body</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <Logo variant="simple" size="large" />
          </div>
                    <h1 className="text-4xl font-bold text-card-foreground sm:text-5xl md:text-6xl">
            dISO Registry v1.1
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Search and verify ISO certificates on the Etherlink blockchain. Secure, transparent, and trustworthy certification verification.
          </p>

          {/* Search Bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="bg-card rounded-lg border shadow-sm p-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="block w-full pr-20 border border-input rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg py-4 px-4 bg-background text-card-foreground placeholder-muted-foreground"
                  placeholder="Search by company name, certificate number, or ISO standard..."
                />
                <div className="absolute inset-y-0 right-0 flex items-center p-2">
                  <Button
                    type="button"
                    onClick={handleSearch}
                    variant="link"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results Section */}
          {showResults && (
            <div className="mt-16">
              {/* Error Message */}
              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <p className="text-red-800">{searchError}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="bg-card rounded-lg border shadow-sm p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Searching certificates...</p>
                </div>
              )}

              {/* Results */}
              {!loading && certificates.length > 0 && (
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
                            <Link
                              href={`/verify?id=${cert.certificateNumber}`}
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              Verify
                              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-6 py-4 border-t border-border text-center">
                    <Link 
                      href="/search" 
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Advanced Search →
                    </Link>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!loading && certificates.length === 0 && total === 0 && searchQuery && (
                <div className="bg-card rounded-lg border shadow-sm p-8 text-center">
                  <div className="text-muted-foreground mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-card-foreground mb-2">No certificates found</h3>
                  <p className="text-muted-foreground">Try a different search term or browse all certificates.</p>
                  <Link 
                    href="/search" 
                    className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Advanced Search →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

          {/* Quick Actions */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 mx-1/2">
            <Link href="/verify" className="bg-card border shadow-sm rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        Verify Certificate
                      </dt>
                      <dd className="text-lg font-medium text-card-foreground">
                        Enter certificate number
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/search" className="bg-card border shadow-sm rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        Browse Directory
                      </dt>
                      <dd className="text-lg font-medium text-card-foreground">
                        Find certified companies
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Features Section */}
          <div id="features" className="mt-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-card-foreground">
                Why Choose <ColorizedDisoRegistry />?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Experience the future of certificate verification with blockchain-powered security and transparency.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-card border shadow-sm rounded-lg p-6 text-center">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">Blockchain Security</h3>
                <p className="text-muted-foreground">All certificates are secured on the Etherlink blockchain, ensuring immutable and tamper-proof records.</p>
              </div>
              
              <div className="bg-card border shadow-sm rounded-lg p-6 text-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">Instant Verification</h3>
                <p className="text-muted-foreground">Verify certificates instantly with real-time blockchain validation and IPFS document storage.</p>
              </div>
              
              <div className="bg-card border shadow-sm rounded-lg p-6 text-center">
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">Global Access</h3>
                <p className="text-muted-foreground">Access certificates from anywhere in the world with our distributed, decentralized registry system.</p>
              </div>
            </div>
          </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2025 <ColorizedDisoRegistry />. All rights reserved.</p>
            <p className="mt-2 text-sm">Powered by Etherlink blockchain technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
