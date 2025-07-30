// Tenant utility functions

/**
 * Generate random bytes using Web Crypto API
 */
function getRandomBytes(size: number): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    return window.crypto.getRandomValues(new Uint8Array(size));
  } else if (typeof global !== 'undefined' && global.crypto) {
    // Node.js environment with crypto global
    return global.crypto.getRandomValues(new Uint8Array(size));
  } else {
    // Fallback for Node.js - dynamic import
    const crypto = require('crypto');
    return crypto.randomBytes(size);
  }
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert Uint8Array to base64url string
 */
function bytesToBase64url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate a URL-friendly slug from tenant name
 */
export function generateTenantSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a secure invitation token
 */
export function generateInvitationToken(): string {
  const bytes = getRandomBytes(32);
  return bytesToHex(bytes);
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const prefix = 'defiso_';
  const bytes = getRandomBytes(24);
  const key = bytesToBase64url(bytes);
  return `${prefix}${key}`;
}

/**
 * Hash a password securely (simplified for client-side)
 * Note: In production, password hashing should be done server-side with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const saltBytes = getRandomBytes(16);
  const salt = bytesToHex(saltBytes);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Use Web Crypto API for browser
    const combined = new Uint8Array(saltBytes.length + data.length);
    combined.set(saltBytes);
    combined.set(data, saltBytes.length);
    
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', combined);
    const hash = bytesToHex(new Uint8Array(hashBuffer));
    return `${salt}:${hash}`;
  } else {
    // Fallback simple hash (not secure for production)
    return `${salt}:${password.length.toString(16)}`;
  }
}

/**
 * Verify a password against a hash (simplified for client-side)
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(':');
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const saltBytes = new Uint8Array(salt.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    
    const combined = new Uint8Array(saltBytes.length + data.length);
    combined.set(saltBytes);
    combined.set(data, saltBytes.length);
    
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', combined);
    const verifyHash = bytesToHex(new Uint8Array(hashBuffer));
    return hash === verifyHash;
  } else {
    // Fallback simple verification
    return hash === password.length.toString(16);
  }
}

/**
 * Generate a verification code for certificates
 */
export function generateVerificationCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate tenant slug format
 */
export function validateTenantSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug) {
    return { isValid: false, error: 'Slug is required' };
  }
  
  if (slug.length < 2) {
    return { isValid: false, error: 'Slug must be at least 2 characters' };
  }
  
  if (slug.length > 63) {
    return { isValid: false, error: 'Slug must be less than 63 characters' };
  }
  
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!slugRegex.test(slug)) {
    return { isValid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  
  if (slug.includes('--')) {
    return { isValid: false, error: 'Slug cannot contain consecutive hyphens' };
  }
  
  const reservedSlugs = [
    'www', 'api', 'admin', 'docs', 'status', 'blog', 'help', 'support',
    'mail', 'email', 'ftp', 'app', 'dashboard', 'portal', 'auth', 'login',
    'signup', 'register', 'about', 'contact', 'terms', 'privacy', 'security',
    'pricing', 'features', 'enterprise', 'pro', 'premium', 'basic', 'free',
    'defiso', 'iso', 'certification', 'registry', 'tezos', 'etherlink'
  ];
  
  if (reservedSlugs.includes(slug)) {
    return { isValid: false, error: 'This slug is reserved and cannot be used' };
  }
  
  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate tenant subdomain from slug
 */
export function generateSubdomain(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Validate domain format
 */
export function validateDomain(domain: string): { isValid: boolean; error?: string } {
  if (!domain) {
    return { isValid: false, error: 'Domain is required' };
  }
  
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    return { isValid: false, error: 'Invalid domain format' };
  }
  
  if (domain.length > 253) {
    return { isValid: false, error: 'Domain name too long' };
  }
  
  return { isValid: true };
}

/**
 * Generate a secure random password
 */
export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

/**
 * Format tenant plan display name
 */
export function formatPlanName(plan: string): string {
  switch (plan.toLowerCase()) {
    case 'basic':
      return 'Basic';
    case 'professional':
      return 'Professional';
    case 'enterprise':
      return 'Enterprise';
    default:
      return plan;
  }
}

/**
 * Get plan limits
 */
export function getPlanLimits(plan: string): {
  maxCertificates: number;
  maxUsers: number;
  maxApiCalls: number;
  features: string[];
} {
  const limits = {
    basic: {
      maxCertificates: 100,
      maxUsers: 5,
      maxApiCalls: 1000,
      features: ['basic_search', 'certificate_management']
    },
    professional: {
      maxCertificates: 1000,
      maxUsers: 25,
      maxApiCalls: 10000,
      features: ['basic_search', 'certificate_management', 'api_access', 'custom_branding']
    },
    enterprise: {
      maxCertificates: -1, // Unlimited
      maxUsers: -1, // Unlimited
      maxApiCalls: -1, // Unlimited
      features: [
        'basic_search', 'certificate_management', 'api_access', 'custom_branding',
        'custom_domain', 'advanced_analytics', 'white_label', 'sso'
      ]
    }
  };
  
  return limits[plan.toLowerCase() as keyof typeof limits] || limits.basic;
}

/**
 * Check if tenant has feature
 */
export function tenantHasFeature(tenantPlan: string, tenantFeatures: string[], feature: string): boolean {
  const planLimits = getPlanLimits(tenantPlan);
  return planLimits.features.includes(feature) || tenantFeatures.includes(feature);
}

/**
 * Sanitize tenant name for display
 */
export function sanitizeTenantName(name: string): string {
  return name.trim().replace(/[<>]/g, '');
}
