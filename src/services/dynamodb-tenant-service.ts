// DynamoDB service layer for multitenant operations
import { 
  DynamoDBClient, 
  GetItemCommand, 
  PutItemCommand, 
  QueryCommand, 
  UpdateItemCommand, 
  DeleteItemCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand as DocQueryCommand, 
  UpdateCommand, 
  DeleteCommand,
  ScanCommand as DocScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Tenant, TenantUser, TenantInvitation } from '@/types/tenant';
import { ISOCertificate } from '@/types/certificate';
import { generateTenantSlug, generateInvitationToken } from '@/lib/utils/tenant-utils';


// Configure DynamoDB client for Lambda/IAM role (no explicit credentials)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.DEFISO_AWS_REGION || 'eu-west-2',
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';

const TABLES = {
  TENANTS: `${TABLE_PREFIX}-tenants`,
  USERS: `${TABLE_PREFIX}-users`,
  CERTIFICATES: `${TABLE_PREFIX}-certificates`,
  BLOCKCHAIN_TRANSACTIONS: `${TABLE_PREFIX}-blockchain-transactions`,
  AUDIT_LOGS: `${TABLE_PREFIX}-audit-logs`,
};

export class DynamoDBTenantService {
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
    const id = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const slug = data.slug || generateTenantSlug(data.name);
    
    // Check if slug is available
    const existingTenant = await this.getTenantBySlug(slug);
    if (existingTenant) {
      throw new Error('Tenant slug already exists');
    }
    
    const tenant: Tenant = {
      id,
      name: data.name,
      slug,
      domain: data.domain,
      subdomain: data.subdomain,
      status: 'active',
      plan: data.plan || 'basic',
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
      blockchain: {},
      contactInfo: {
        email: data.email
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Create tenant
    await docClient.send(new PutCommand({
      TableName: TABLES.TENANTS,
      Item: {
        ...tenant,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
    }));
    
    // Create initial admin user
    await this.createTenantUser({
      tenantId: tenant.id,
      email: data.email,
      firstName: 'Admin',
      lastName: 'User',
      role: 'tenant_admin',
      status: 'active'
    });
    
    return tenant;
  }
  
  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.TENANTS,
      Key: { id },
    }));
    
    return result.Item ? this.mapTenantFromDynamoDB(result.Item) : null;
  }
  
  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.TENANTS,
      IndexName: 'slug-index',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug,
      },
    }));
    
    return result.Items && result.Items.length > 0 
      ? this.mapTenantFromDynamoDB(result.Items[0]) 
      : null;
  }
  
  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.TENANTS,
      IndexName: 'domain-index',
      KeyConditionExpression: 'domain = :domain',
      ExpressionAttributeValues: {
        ':domain': domain,
      },
    }));
    
    return result.Items && result.Items.length > 0 
      ? this.mapTenantFromDynamoDB(result.Items[0]) 
      : null;
  }
  
  /**
   * Update tenant
   */
  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Build update expression dynamically
    Object.entries(data).forEach(([key, value], index) => {
      if (key !== 'id' && value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });
    
    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLES.TENANTS,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));
    
    return this.mapTenantFromDynamoDB(result.Attributes!);
  }
  
  /**
   * Delete tenant
   */
  async deleteTenant(id: string): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: TABLES.TENANTS,
      Key: { id },
    }));
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
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const user: TenantUser = {
      id,
      tenantId: data.tenantId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as any,
      status: (data.status as any) || 'pending',
      permissions: data.permissions || [],
      emailVerified: false,
      settings: {
        notifications: {
          email: true,
          certificateExpiry: true,
          auditReminders: true,
        },
        language: 'en',
        timezone: 'UTC',
      },
      profile: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await docClient.send(new PutCommand({
      TableName: TABLES.USERS,
      Item: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    }));
    
    return user;
  }
  
  /**
   * Get tenant users
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'tenant-email-index',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
      },
    }));
    
    return result.Items?.map(this.mapTenantUserFromDynamoDB) || [];
  }
  
  /**
   * Get tenant user by email
   */
  async getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | null> {
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'tenant-email-index',
      KeyConditionExpression: 'tenantId = :tenantId AND email = :email',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
        ':email': email,
      },
    }));
    
    return result.Items && result.Items.length > 0 
      ? this.mapTenantUserFromDynamoDB(result.Items[0]) 
      : null;
  }
  
  /**
   * Create certificate
   */
  async createCertificate(tenantId: string, data: Partial<ISOCertificate>): Promise<ISOCertificate> {
    const id = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const certificate: ISOCertificate = {
      id,
      tenantId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ISOCertificate;
    
    await docClient.send(new PutCommand({
      TableName: TABLES.CERTIFICATES,
      Item: {
        ...certificate,
        createdAt: certificate.createdAt.toISOString(),
        updatedAt: certificate.updatedAt.toISOString(),
        issuedDate: certificate.issuedDate.toISOString(),
        expiryDate: certificate.expiryDate.toISOString(),
      },
    }));
    
    return certificate;
  }
  
  /**
   * Get certificates by tenant
   */
  async getCertificatesByTenant(tenantId: string, limit?: number): Promise<ISOCertificate[]> {
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.CERTIFICATES,
      IndexName: 'tenant-certificate-index',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId,
      },
      Limit: limit,
    }));
    
    return result.Items?.map(this.mapCertificateFromDynamoDB) || [];
  }
  
  /**
   * Get certificate by number (public search)
   */
  async getCertificateByNumber(certificateNumber: string): Promise<ISOCertificate | null> {
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.CERTIFICATES,
      IndexName: 'public-certificate-index',
      KeyConditionExpression: 'certificateNumber = :certNumber',
      ExpressionAttributeValues: {
        ':certNumber': certificateNumber,
      },
    }));
    
    return result.Items && result.Items.length > 0 
      ? this.mapCertificateFromDynamoDB(result.Items[0]) 
      : null;
  }
  
  /**
   * Get certificates issued by a specific user
   */
  async getCertificatesByIssuedUser(params: {
    tenantId: string;
    issuedByUserId: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    certificates: ISOCertificate[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { tenantId, issuedByUserId, status, page = 1, limit = 10 } = params;
    
    try {
      // Use Scan operation to find certificates by issuedByUserId
      // This is less efficient than Query but works for filtering by user
      let filterExpression = 'tenantId = :tenantId AND issuedByUserId = :issuedByUserId';
      const expressionAttributeValues: Record<string, any> = {
        ':tenantId': tenantId,
        ':issuedByUserId': issuedByUserId,
      };
      
      const expressionAttributeNames: Record<string, string> = {};
      
      if (status) {
        filterExpression += ' AND #status = :status';
        expressionAttributeValues[':status'] = status;
        expressionAttributeNames['#status'] = 'status';
      }
      
      const result = await docClient.send(new DocScanCommand({
        TableName: TABLES.CERTIFICATES,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        Limit: limit * 3, // Scan more items since we're filtering
      }));
      
      const certificates = result.Items?.map(this.mapCertificateFromDynamoDB) || [];
      
      // Apply pagination manually since we're using Scan
      const startIndex = (page - 1) * limit;
      const paginatedCertificates = certificates.slice(startIndex, startIndex + limit);
      
      return {
        certificates: paginatedCertificates,
        total: certificates.length,
        page,
        limit,
      };
      
    } catch (error) {
      console.error('Error fetching certificates by user:', error);
      return {
        certificates: [],
        total: 0,
        page,
        limit,
      };
    }
  }

  /**
   * Search certificates
   */
  async searchCertificates(params: {
    tenantId?: string;
    organizationName?: string;
    standard?: string;
    status?: string;
    limit?: number;
  }): Promise<ISOCertificate[]> {
    const { tenantId, organizationName, standard, status, limit } = params;
    
    if (!tenantId) {
      // Public search - scan all certificates (expensive, consider caching)
      const result = await docClient.send(new DocScanCommand({
        TableName: TABLES.CERTIFICATES,
        Limit: limit || 100,
      }));
      return result.Items?.map(this.mapCertificateFromDynamoDB) || [];
    }
    
    // Tenant-specific search
    let indexName = 'tenant-certificate-index';
    let keyCondition = 'tenantId = :tenantId';
    const expressionAttributeValues: Record<string, any> = {
      ':tenantId': tenantId,
    };
    
    if (organizationName) {
      indexName = 'tenant-organization-index';
      keyCondition = 'tenantId = :tenantId AND organizationName = :orgName';
      expressionAttributeValues[':orgName'] = organizationName;
    } else if (standard) {
      indexName = 'tenant-standard-index';
      keyCondition = 'tenantId = :tenantId AND standard = :standard';
      expressionAttributeValues[':standard'] = standard;
    } else if (status) {
      indexName = 'tenant-status-index';
      keyCondition = 'tenantId = :tenantId AND #status = :status';
      expressionAttributeValues[':status'] = status;
    }
    
    const result = await docClient.send(new DocQueryCommand({
      TableName: TABLES.CERTIFICATES,
      IndexName: indexName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: status ? { '#status': 'status' } : undefined,
      Limit: limit,
    }));
    
    return result.Items?.map(this.mapCertificateFromDynamoDB) || [];
  }
  
  /**
   * Map DynamoDB item to Tenant domain model
   */
  private mapTenantFromDynamoDB(item: any): Tenant {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
  }
  
  /**
   * Map DynamoDB item to TenantUser domain model
   */
  private mapTenantUserFromDynamoDB(item: any): TenantUser {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      lastLoginAt: item.lastLoginAt ? new Date(item.lastLoginAt) : undefined,
    };
  }
  
  /**
   * Map DynamoDB item to Certificate domain model
   */
  private mapCertificateFromDynamoDB(item: any): ISOCertificate {
    return {
      ...item,
      issuedDate: new Date(item.issuedDate),
      expiryDate: new Date(item.expiryDate),
      suspendedDate: item.suspendedDate ? new Date(item.suspendedDate) : undefined,
      revokedDate: item.revokedDate ? new Date(item.revokedDate) : undefined,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
  }
}

// Export singleton instance
export const dynamoDBTenantService = new DynamoDBTenantService();
