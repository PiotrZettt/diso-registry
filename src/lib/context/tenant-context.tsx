// Tenant context provider for React components
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant, TenantUser } from '@/types/tenant';

interface TenantContextValue {
  tenant: Tenant | null;
  user: TenantUser | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: Tenant | null;
  initialUser?: TenantUser | null;
}

export function TenantProvider({ 
  children, 
  initialTenant = null, 
  initialUser = null 
}: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant);
  const [user, setUser] = useState<TenantUser | null>(initialUser);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tenant context on mount
  useEffect(() => {
    if (!tenant && typeof window !== 'undefined') {
      loadTenantContext();
    }
  }, []);

  // Update permissions when user changes
  useEffect(() => {
    if (user) {
      setPermissions(user.permissions || []);
    } else {
      setPermissions([]);
    }
  }, [user]);

  const loadTenantContext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tenant/context', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load tenant context');
      }

      const data = await response.json();
      setTenant(data.tenant);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTenant = async () => {
    await loadTenantContext();
  };

  const switchTenant = async (tenantId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tenant/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to switch tenant');
      }

      // Reload the page to apply new tenant context
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission) || permissions.includes('*');
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const value: TenantContextValue = {
    tenant,
    user,
    permissions,
    isLoading,
    error,
    refreshTenant,
    switchTenant,
    hasPermission,
    hasRole,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Hook for checking permissions
export function usePermissions() {
  const { hasPermission, hasRole, permissions, user } = useTenant();
  
  return {
    hasPermission,
    hasRole,
    permissions,
    role: user?.role,
    isAdmin: hasRole('tenant_admin'),
    isCertificationBody: hasRole('certification_body'),
    isAuditor: hasRole('auditor'),
    isOperator: hasRole('operator'),
    isViewer: hasRole('viewer'),
  };
}

// Hook for tenant branding
export function useTenantBranding() {
  const { tenant } = useTenant();
  
  const getBrandColor = (type: 'primary' | 'secondary') => {
    if (!tenant?.branding) return type === 'primary' ? '#3B82F6' : '#64748B';
    return tenant.branding[`${type}Color`] || (type === 'primary' ? '#3B82F6' : '#64748B');
  };
  
  const getBrandLogo = () => {
    return tenant?.branding?.logo || '/diso-logo-simple.svg';
  };
  
  const getBrandFavicon = () => {
    return tenant?.branding?.favicon || '/diso-logo-simple.svg';
  };
  
  const getCustomCss = () => {
    return tenant?.branding?.customCss || '';
  };
  
  return {
    tenant,
    primaryColor: getBrandColor('primary'),
    secondaryColor: getBrandColor('secondary'),
    logo: getBrandLogo(),
    favicon: getBrandFavicon(),
    customCss: getCustomCss(),
  };
}

// HOC for protecting components with permissions
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string
) {
  return function PermissionProtectedComponent(props: P) {
    const { hasPermission, isLoading } = useTenant();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!hasPermission(requiredPermission)) {
      return <div>You don't have permission to access this component.</div>;
    }
    
    return <Component {...props} />;
  };
}

// HOC for protecting components with roles
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: string
) {
  return function RoleProtectedComponent(props: P) {
    const { hasRole, isLoading } = useTenant();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!hasRole(requiredRole)) {
      return <div>You don't have the required role to access this component.</div>;
    }
    
    return <Component {...props} />;
  };
}
