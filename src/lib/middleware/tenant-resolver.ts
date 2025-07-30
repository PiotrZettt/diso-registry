// Tenant resolution logic for multitenant routing

import { NextRequest } from 'next/server';
import { Tenant } from '@/types/tenant';

export interface TenantResolutionStrategy {
  subdomain: boolean;
  domain: boolean;
  header: boolean;
  path: boolean;
}

const defaultStrategy: TenantResolutionStrategy = {
  subdomain: true,
  domain: true,
  header: true,
  path: false, // Disabled by default for cleaner URLs
};

/**
 * Resolve tenant from incoming request using multiple strategies
 */
export async function getTenantFromRequest(
  request: NextRequest,
  strategy: TenantResolutionStrategy = defaultStrategy
): Promise<Tenant | null> {
  // Try different resolution strategies in order of priority
  
  // 1. Custom domain resolution
  if (strategy.domain) {
    const tenant = await getTenantByDomain(request);
    if (tenant) return tenant;
  }
  
  // 2. Subdomain resolution
  if (strategy.subdomain) {
    const tenant = await getTenantBySubdomain(request);
    if (tenant) return tenant;
  }
  
  // 3. Header-based resolution (for API requests)
  if (strategy.header) {
    const tenant = await getTenantByHeader(request);
    if (tenant) return tenant;
  }
  
  // 4. Path-based resolution (optional)
  if (strategy.path) {
    const tenant = await getTenantByPath(request);
    if (tenant) return tenant;
  }
  
  return null;
}

/**
 * Get tenant by custom domain
 */
async function getTenantByDomain(request: NextRequest): Promise<Tenant | null> {
  const host = request.headers.get('host');
  if (!host) return null;
  
  // Skip if it's the main domain
  const mainDomains = [
    'defiso.com',
    'www.defiso.com',
    'localhost:3000',
    '127.0.0.1:3000'
  ];
  
  if (mainDomains.includes(host)) {
    return null;
  }
  
  // Look up tenant by custom domain
  try {
    const tenant = await findTenantByDomain(host);
    return tenant;
  } catch (error) {
    console.error('Error resolving tenant by domain:', error);
    return null;
  }
}

/**
 * Get tenant by subdomain
 */
async function getTenantBySubdomain(request: NextRequest): Promise<Tenant | null> {
  const host = request.headers.get('host');
  if (!host) return null;
  
  // Extract subdomain
  const subdomain = extractSubdomain(host);
  if (!subdomain) return null;
  
  // Skip system subdomains
  const systemSubdomains = ['www', 'api', 'admin', 'docs', 'status'];
  if (systemSubdomains.includes(subdomain)) {
    return null;
  }
  
  try {
    const tenant = await findTenantBySubdomain(subdomain);
    return tenant;
  } catch (error) {
    console.error('Error resolving tenant by subdomain:', error);
    return null;
  }
}

/**
 * Get tenant by header (for API requests)
 */
async function getTenantByHeader(request: NextRequest): Promise<Tenant | null> {
  const tenantId = request.headers.get('x-tenant-id');
  const tenantSlug = request.headers.get('x-tenant-slug');
  
  if (tenantId) {
    try {
      return await findTenantById(tenantId);
    } catch (error) {
      console.error('Error resolving tenant by ID:', error);
    }
  }
  
  if (tenantSlug) {
    try {
      return await findTenantBySlug(tenantSlug);
    } catch (error) {
      console.error('Error resolving tenant by slug:', error);
    }
  }
  
  return null;
}

/**
 * Get tenant by path (optional strategy)
 */
async function getTenantByPath(request: NextRequest): Promise<Tenant | null> {
  const { pathname } = request.nextUrl;
  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Check if first segment is a tenant slug
  if (pathSegments.length > 0) {
    const potentialSlug = pathSegments[0];
    
    try {
      const tenant = await findTenantBySlug(potentialSlug);
      return tenant;
    } catch (error) {
      // Not a tenant slug, continue
    }
  }
  
  return null;
}

/**
 * Extract subdomain from host
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length < 3) return null;
  
  // Return first part as subdomain
  return parts[0];
}

/**
 * Database/cache lookup functions using DynamoDB
 */
async function findTenantByDomain(domain: string): Promise<Tenant | null> {
  try {
    const { dynamoDBTenantService } = await import('@/services/dynamodb-tenant-service');
    return await dynamoDBTenantService.getTenantByDomain(domain);
  } catch (error) {
    console.error('Error finding tenant by domain:', error);
    return null;
  }
}

async function findTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  try {
    const { dynamoDBTenantService } = await import('@/services/dynamodb-tenant-service');
    return await dynamoDBTenantService.getTenantBySlug(subdomain);
  } catch (error) {
    console.error('Error finding tenant by subdomain:', error);
    return null;
  }
}

async function findTenantById(id: string): Promise<Tenant | null> {
  try {
    const { dynamoDBTenantService } = await import('@/services/dynamodb-tenant-service');
    return await dynamoDBTenantService.getTenantById(id);
  } catch (error) {
    console.error('Error finding tenant by ID:', error);
    return null;
  }
}

async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const { dynamoDBTenantService } = await import('@/services/dynamodb-tenant-service');
    return await dynamoDBTenantService.getTenantBySlug(slug);
  } catch (error) {
    console.error('Error finding tenant by slug:', error);
    return null;
  }
}

/**
 * Utility functions for tenant context
 */
export function buildTenantUrl(tenant: Tenant, path: string = ''): string {
  if (tenant.domain) {
    return `https://${tenant.domain}${path}`;
  }
  
  if (tenant.subdomain) {
    return `https://${tenant.subdomain}.defiso.com${path}`;
  }
  
  // Fallback to slug-based URL
  return `https://defiso.com/${tenant.slug}${path}`;
}

export function getTenantFromUrl(url: string): {
  tenantSlug?: string;
  subdomain?: string;
  domain?: string;
} {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // Check for custom domain
    if (!hostname.includes('defiso.com')) {
      return { domain: hostname };
    }
    
    // Check for subdomain
    const subdomain = extractSubdomain(hostname);
    if (subdomain && subdomain !== 'www') {
      return { subdomain };
    }
    
    // Check for path-based tenant
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      return { tenantSlug: pathSegments[0] };
    }
    
    return {};
  } catch (error) {
    return {};
  }
}

/**
 * Validate tenant slug format
 */
export function isValidTenantSlug(slug: string): boolean {
  // Only allow lowercase letters, numbers, and hyphens
  // Must start and end with alphanumeric character
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  
  return (
    slugRegex.test(slug) &&
    slug.length >= 2 &&
    slug.length <= 63 &&
    !slug.includes('--') && // No consecutive hyphens
    !isReservedSlug(slug)
  );
}

/**
 * Check if slug is reserved
 */
function isReservedSlug(slug: string): boolean {
  const reserved = [
    'www', 'api', 'admin', 'docs', 'status', 'blog', 'help', 'support',
    'mail', 'email', 'ftp', 'app', 'dashboard', 'portal', 'auth', 'login',
    'signup', 'register', 'about', 'contact', 'terms', 'privacy', 'security',
    'pricing', 'features', 'enterprise', 'pro', 'premium', 'basic', 'free',
    'defiso', 'iso', 'certification', 'registry', 'tezos', 'etherlink'
  ];
  
  return reserved.includes(slug.toLowerCase());
}
