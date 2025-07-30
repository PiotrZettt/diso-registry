// Tenant context middleware for multitenant routing and isolation

import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from './tenant-resolver';
import { Tenant } from '@/types/tenant';

export interface TenantMiddlewareConfig {
  publicRoutes: string[];
  tenantRequiredRoutes: string[];
  adminRoutes: string[];
  apiRoutes: string[];
}

const defaultConfig: TenantMiddlewareConfig = {
  publicRoutes: ['/', '/search', '/verify', '/about', '/contact'],
  tenantRequiredRoutes: ['/dashboard', '/certificates', '/users', '/settings'],
  adminRoutes: ['/admin'],
  apiRoutes: ['/api']
};

export async function tenantMiddleware(
  request: NextRequest,
  config: TenantMiddlewareConfig = defaultConfig
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  try {
    // Resolve tenant from request
    const tenant = await getTenantFromRequest(request);
    
    // Handle public routes
    if (config.publicRoutes.includes(pathname)) {
      return handlePublicRoute(request, tenant);
    }
    
    // Handle API routes
    if (pathname.startsWith('/api/')) {
      return handleApiRoute(request, tenant);
    }
    
    // Handle admin routes
    if (config.adminRoutes.some(route => pathname.startsWith(route))) {
      return handleAdminRoute(request, tenant);
    }
    
    // Handle tenant-required routes
    if (config.tenantRequiredRoutes.some(route => pathname.startsWith(route))) {
      return handleTenantRoute(request, tenant);
    }
    
    // Default handling
    return NextResponse.next();
    
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePublicRoute(
  request: NextRequest,
  tenant: Tenant | null
): Promise<NextResponse> {
  const response = NextResponse.next();
  
  // Add tenant context to headers if available
  if (tenant) {
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
  }
  
  return response;
}

async function handleApiRoute(
  request: NextRequest,
  tenant: Tenant | null
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  
  // Public API routes that don't require tenant
  const publicApiRoutes = [
    '/api/health',
    '/api/search',
    '/api/verify',
    '/api/auth'
  ];
  
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    if (tenant) {
      response.headers.set('x-tenant-id', tenant.id);
    }
    return response;
  }
  
  // Protected API routes require tenant
  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }
  
  // Check tenant status
  if (tenant.status !== 'active') {
    return NextResponse.json(
      { error: 'Tenant not active' },
      { status: 403 }
    );
  }
  
  // Add tenant context to headers
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', tenant.slug);
  response.headers.set('x-tenant-plan', tenant.plan);
  
  return response;
}

async function handleAdminRoute(
  request: NextRequest,
  tenant: Tenant | null
): Promise<NextResponse> {
  // Admin routes are for super admin only
  // Redirect to login or unauthorized page
  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  return NextResponse.redirect(url);
}

async function handleTenantRoute(
  request: NextRequest,
  tenant: Tenant | null
): Promise<NextResponse> {
  const url = request.nextUrl.clone();
  
  // Require tenant for protected routes
  if (!tenant) {
    // Redirect to tenant selection or 404
    url.pathname = '/tenant-not-found';
    return NextResponse.redirect(url);
  }
  
  // Check tenant status
  if (tenant.status !== 'active') {
    url.pathname = '/tenant-inactive';
    return NextResponse.redirect(url);
  }
  
  // Add tenant context to headers
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', tenant.slug);
  response.headers.set('x-tenant-plan', tenant.plan);
  
  return response;
}

// Utility function to get tenant from response headers
export function getTenantFromHeaders(headers: Headers): {
  tenantId?: string;
  tenantSlug?: string;
  tenantPlan?: string;
} {
  return {
    tenantId: headers.get('x-tenant-id') || undefined,
    tenantSlug: headers.get('x-tenant-slug') || undefined,
    tenantPlan: headers.get('x-tenant-plan') || undefined,
  };
}

// Rate limiting per tenant
export function getTenantRateLimit(tenant: Tenant): {
  requests: number;
  windowMs: number;
} {
  const limits = {
    basic: { requests: 100, windowMs: 60000 }, // 100 requests per minute
    professional: { requests: 500, windowMs: 60000 }, // 500 requests per minute
    enterprise: { requests: 2000, windowMs: 60000 }, // 2000 requests per minute
  };
  
  return limits[tenant.plan] || limits.basic;
}
