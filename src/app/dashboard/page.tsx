'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ColorizedDisoRegistry } from '@/components/ui/ColorizedDiso';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalCertificates: number;
  activeCertificates: number;
  expiredCertificates: number;
  revokedCertificates: number;
  suspendedCertificates: number;
  certificatesThisMonth: number;
  expiringCertificates: number;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Failed to fetch stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-card-foreground">
<ColorizedDisoRegistry />
                </h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-card-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-muted-foreground capitalize">{user.role?.replace('_', ' ')}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Welcome section */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-card-foreground mb-2">
                Welcome back, {user.firstName}!
              </h2>
              <p className="text-muted-foreground">
                You're signed in as a <span className="font-medium capitalize">{user.role?.replace('_', ' ')}</span> for the <ColorizedDisoRegistry />.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-card-foreground mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/certificates/issue')}
                  className="w-full h-auto p-6 flex flex-col items-center"
                >
                  <svg className="h-8 w-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-card-foreground">
                    Issue New Certificate
                  </span>
                </Button>
                
                <button
                  onClick={() => router.push('/certificates')}
                  className="relative block w-full rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="mx-auto h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-card-foreground">
                    View Certificates
                  </span>
                </button>
                
                <button
                  onClick={() => router.push('/search')}
                  className="relative block w-full rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="mx-auto h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-card-foreground">
                    Search Registry
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        Certificates Issued
                      </dt>
                      <dd className="text-lg font-medium text-card-foreground">
                        {statsLoading ? '...' : (stats?.totalCertificates || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        Active Certificates
                      </dt>
                      <dd className="text-lg font-medium text-card-foreground">
                        {statsLoading ? '...' : (stats?.activeCertificates || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        This Month
                      </dt>
                      <dd className="text-lg font-medium text-card-foreground">
                        {statsLoading ? '...' : (stats?.certificatesThisMonth || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        Expiring Soon
                      </dt>
                      <dd className="text-lg font-medium text-card-foreground">
                        {statsLoading ? '...' : (stats?.expiringCertificates || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Certification Body Information */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-card-foreground mb-4">
                Certification Body Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Organization Name</dt>
                  <dd className="mt-1 text-sm text-card-foreground">{(user as any).certificationBody?.name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Accreditation Number</dt>
                  <dd className="mt-1 text-sm text-card-foreground">{(user as any).certificationBody?.accreditationNumber || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Accreditation Body</dt>
                  <dd className="mt-1 text-sm text-card-foreground">{(user as any).certificationBody?.accreditation?.accreditationBody || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Country</dt>
                  <dd className="mt-1 text-sm text-card-foreground">{(user as any).certificationBody?.country || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">ISO Scope</dt>
                  <dd className="mt-1 text-sm text-card-foreground">
                    {(user as any).certificationBody?.accreditation?.scope?.join(', ') || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Website</dt>
                  <dd className="mt-1 text-sm text-card-foreground">
                    {(user as any).certificationBody?.website ? (
                      <a href={(user as any).certificationBody.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                        {(user as any).certificationBody.website}
                      </a>
                    ) : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
