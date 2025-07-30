'use client';

import { useTenant, useTenantBranding } from "@/lib/context/tenant-context";
import { useState } from "react";

export default function Home() {
  const { tenant, isLoading, error } = useTenant();
  const { primaryColor, secondaryColor, logo } = useTenantBranding();
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={logo} 
                alt="Logo" 
                className="h-8 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-default.svg';
                }}
              />
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {tenant?.name || 'DeFi ISO Registry'}
                </h1>
                {tenant && (
                  <p className="text-sm text-gray-500">
                    Tenant: {tenant.slug} ({tenant.plan})
                  </p>
                )}
              </div>
            </div>
            <nav className="flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-gray-900">Search</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Verify</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Dashboard</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            ISO Certification Registry
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            {tenant ? 
              `Welcome to ${tenant.name}'s ISO certification registry. Search and verify ISO certificates on the blockchain.` :
              'Search and verify ISO certificates on the Tezos and Etherlink blockchains.'
            }
          </p>

          {/* Search Bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pr-20 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg py-4 px-4"
                placeholder="Search by company name, certificate number, or ISO standard..."
                style={{ borderColor: primaryColor }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="button"
                  className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-r-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Verify Certificate
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Enter certificate number
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Browse Directory
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Find certified companies
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Documentation
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        API & Integration
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Information (for development) */}
        {tenant && (
          <div className="mt-16 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span> {tenant.name}
              </div>
              <div>
                <span className="font-medium text-gray-700">Slug:</span> {tenant.slug}
              </div>
              <div>
                <span className="font-medium text-gray-700">Plan:</span> {tenant.plan}
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span> {tenant.status}
              </div>
              {tenant.domain && (
                <div>
                  <span className="font-medium text-gray-700">Domain:</span> {tenant.domain}
                </div>
              )}
              {tenant.subdomain && (
                <div>
                  <span className="font-medium text-gray-700">Subdomain:</span> {tenant.subdomain}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2025 {tenant?.name || 'DeFi ISO Registry'}. All rights reserved.</p>
            <p className="mt-2 text-sm">Powered by Tezos and Etherlink blockchain technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
