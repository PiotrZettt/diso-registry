// Tenant and multitenancy type definitions

export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  domain?: string; // Custom domain
  subdomain?: string; // Subdomain (e.g., acme.defiso.com)
  status: 'active' | 'inactive' | 'suspended';
  plan: 'basic' | 'professional' | 'enterprise';
  
  // Branding
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    favicon?: string;
    customCss?: string;
  };
  
  // Configuration
  settings: {
    allowPublicSearch: boolean;
    requireEmailVerification: boolean;
    enableApiAccess: boolean;
    maxCertificates: number;
    maxUsers: number;
    enableCustomDomain: boolean;
    features: string[]; // Feature flags
  };
  
  // Blockchain configuration
  blockchain: {
    tezosContractAddress?: string;
    etherlinkContractAddress?: string;
    walletAddress?: string; // Tenant's primary wallet
    multiSigWallet?: string; // For critical operations
  };
  
  // Contact & billing
  contactInfo: {
    email: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantContext {
  tenant: Tenant;
  user?: TenantUser;
  permissions: string[];
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  permissions: string[];
  emailVerified: boolean;
  settings: {
    notifications: {
      email: boolean;
      certificateExpiry: boolean;
      auditReminders: boolean;
    };
    language: string;
    timezone: string;
  };
  profile: {
    phone?: string;
    title?: string;
    department?: string;
    avatar?: string;
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 
  | 'tenant_admin'      // Full access to tenant
  | 'certification_body' // Can issue/manage certificates
  | 'auditor'           // Can audit certificates
  | 'operator'          // Can manage day-to-day operations
  | 'viewer';           // Read-only access

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
}

// API context for requests
export interface ApiContext {
  tenant: Tenant;
  user?: TenantUser;
  permissions: string[];
  requestId: string;
}
