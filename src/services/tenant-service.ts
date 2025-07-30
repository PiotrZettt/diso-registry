// Tenant service layer for database operations
import { PrismaClient } from '@prisma/client';
import { Tenant, TenantUser, TenantInvitation } from '@/types/tenant';
import { generateTenantSlug, generateInvitationToken } from '@/lib/utils/tenant-utils';

const prisma = new PrismaClient();

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(data: {
    name: string;
    email: string;
    slug?: string;
    domain?: string;
    subdomain?: string;
    plan?: 'basic' | 'professional' | 'enterprise';
    branding?: any;
    settings?: any;
  }): Promise<Tenant> {
    const slug = data.slug || generateTenantSlug(data.name);
    
    // Check if slug is available
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug }
    });
    
    if (existingTenant) {
      throw new Error('Tenant slug already exists');
    }
    
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug,
        domain: data.domain,
        subdomain: data.subdomain,
        plan: data.plan?.toUpperCase() as any || 'BASIC',
        branding: data.branding || {
          primaryColor: '#3B82F6',
          secondaryColor: '#64748B'
        },
        settings: data.settings || {
          allowPublicSearch: true,
          requireEmailVerification: true,
          enableApiAccess: false,
          maxCertificates: 100,
          maxUsers: 5,
          enableCustomDomain: false,
          features: []
        },
        contactInfo: {
          email: data.email
        }
      }
    });
    
    // Create initial admin user
    await this.createTenantUser({
      tenantId: tenant.id,
      email: data.email,
      firstName: 'Admin',
      lastName: 'User',
      role: 'tenant_admin',
      status: 'active'
    });
    
    return this.mapTenantFromDb(tenant);
  }
  
  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: true,
        _count: {
          select: {
            certificates: true,
            users: true
          }
        }
      }
    });
    
    return tenant ? this.mapTenantFromDb(tenant) : null;
  }
  
  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        users: true,
        _count: {
          select: {
            certificates: true,
            users: true
          }
        }
      }
    });
    
    return tenant ? this.mapTenantFromDb(tenant) : null;
  }
  
  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { domain },
      include: {
        users: true,
        _count: {
          select: {
            certificates: true,
            users: true
          }
        }
      }
    });
    
    return tenant ? this.mapTenantFromDb(tenant) : null;
  }
  
  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        users: true,
        _count: {
          select: {
            certificates: true,
            users: true
          }
        }
      }
    });
    
    return tenant ? this.mapTenantFromDb(tenant) : null;
  }
  
  /**
   * Update tenant
   */
  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        name: data.name,
        domain: data.domain,
        subdomain: data.subdomain,
        status: data.status?.toUpperCase() as any,
        plan: data.plan?.toUpperCase() as any,
        branding: data.branding,
        settings: data.settings,
        contactInfo: data.contactInfo
      },
      include: {
        users: true,
        _count: {
          select: {
            certificates: true,
            users: true
          }
        }
      }
    });
    
    return this.mapTenantFromDb(tenant);
  }
  
  /**
   * Delete tenant
   */
  async deleteTenant(id: string): Promise<void> {
    await prisma.tenant.delete({
      where: { id }
    });
  }
  
  /**
   * Create tenant user
   */
  async createTenantUser(data: {
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status?: string;
    permissions?: string[];
  }): Promise<TenantUser> {
    const user = await prisma.tenantUser.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role.toUpperCase() as any,
        status: data.status?.toUpperCase() as any || 'PENDING',
        permissions: data.permissions || []
      }
    });
    
    return this.mapTenantUserFromDb(user);
  }
  
  /**
   * Get tenant users
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    const users = await prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    
    return users.map(this.mapTenantUserFromDb);
  }
  
  /**
   * Get tenant user by email
   */
  async getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | null> {
    const user = await prisma.tenantUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email
        }
      }
    });
    
    return user ? this.mapTenantUserFromDb(user) : null;
  }
  
  /**
   * Create tenant invitation
   */
  async createTenantInvitation(data: {
    tenantId: string;
    email: string;
    role: string;
    invitedBy: string;
    expiresAt?: Date;
  }): Promise<TenantInvitation> {
    const token = generateInvitationToken();
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const invitation = await prisma.tenantInvitation.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        role: data.role.toUpperCase() as any,
        invitedBy: data.invitedBy,
        token,
        expiresAt
      }
    });
    
    return this.mapTenantInvitationFromDb(invitation);
  }
  
  /**
   * Get tenant invitation by token
   */
  async getTenantInvitationByToken(token: string): Promise<TenantInvitation | null> {
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token },
      include: { tenant: true }
    });
    
    return invitation ? this.mapTenantInvitationFromDb(invitation) : null;
  }
  
  /**
   * Accept tenant invitation
   */
  async acceptTenantInvitation(
    token: string,
    userData: {
      firstName: string;
      lastName: string;
    }
  ): Promise<TenantUser> {
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token }
    });
    
    if (!invitation || invitation.status !== 'PENDING') {
      throw new Error('Invalid or expired invitation');
    }
    
    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }
    
    // Create user
    const user = await this.createTenantUser({
      tenantId: invitation.tenantId,
      email: invitation.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: invitation.role.toLowerCase(),
      status: 'active'
    });
    
    // Update invitation status
    await prisma.tenantInvitation.update({
      where: { token },
      data: { status: 'ACCEPTED' }
    });
    
    return user;
  }
  
  /**
   * Map database tenant to domain model
   */
  private mapTenantFromDb(tenant: any): Tenant {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      status: tenant.status.toLowerCase(),
      plan: tenant.plan.toLowerCase(),
      branding: tenant.branding || {},
      settings: tenant.settings || {},
      blockchain: tenant.blockchain || {},
      contactInfo: tenant.contactInfo || {},
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt
    };
  }
  
  /**
   * Map database tenant user to domain model
   */
  private mapTenantUserFromDb(user: any): TenantUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      permissions: user.permissions || [],
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
  
  /**
   * Map database tenant invitation to domain model
   */
  private mapTenantInvitationFromDb(invitation: any): TenantInvitation {
    return {
      id: invitation.id,
      tenantId: invitation.tenantId,
      email: invitation.email,
      role: invitation.role.toLowerCase(),
      invitedBy: invitation.invitedBy,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      status: invitation.status.toLowerCase(),
      createdAt: invitation.createdAt
    };
  }
}

// Export singleton instance
export const tenantService = new TenantService();
