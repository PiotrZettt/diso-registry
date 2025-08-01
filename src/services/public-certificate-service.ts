// Public certificate search service (no authentication required)
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ISOCertificate } from '@/types/certificate';
import { blockchainService } from './blockchain-service';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-2',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
const CERTIFICATES_TABLE = `${TABLE_PREFIX}-certificates`;

export interface PublicCertificateSearchQuery {
  certificateNumber?: string;
  organizationName?: string;
  standard?: string;
  country?: string;
  status?: 'valid' | 'expired' | 'suspended' | 'revoked';
  issuedAfter?: Date;
  issuedBefore?: Date;
  expiryAfter?: Date;
  expiryBefore?: Date;
  limit?: number;
}

export interface PublicCertificateSearchResult {
  certificates: PublicCertificate[];
  total: number;
  facets?: {
    standards: { [key: string]: number };
    countries: { [key: string]: number };
    statuses: { [key: string]: number };
    certificationBodies: { [key: string]: number };
  };
}

export interface PublicCertificate {
  id: string;
  certificateNumber: string;
  issuerName: string;
  organization: {
    name: string;
    country: string;
    city: string;
  };
  standard: {
    number: string;
    title: string;
    category: string;
  };
  issuedDate: string; // ISO string for API serialization
  expiryDate: string; // ISO string for API serialization
  status: string;
  scope: {
    description: string;
    sites: Array<{
      name: string;
      city: string;
      country: string;
    }>;
  };
  verificationCode: string;
  blockchain?: {
    etherlinkTransactionHash?: string;
    ipfsHash?: string;
  };
  isExpired: boolean;
  daysUntilExpiry: number;
}

export class PublicCertificateService {
  /**
   * Search certificates publicly (no authentication required)
   */
  async searchCertificates(query: PublicCertificateSearchQuery): Promise<PublicCertificateSearchResult> {
    try {
      const limit = Math.min(query.limit || 50, 100); // Max 100 results
      
      // If searching by certificate number, do direct lookup
      if (query.certificateNumber) {
        return await this.searchByCertificateNumber(query.certificateNumber);
      }

      // If searching by organization, use GSI1
      if (query.organizationName) {
        return await this.searchByOrganization(query.organizationName, query, limit);
      }

      // If searching by standard, use GSI2
      if (query.standard) {
        return await this.searchByStandard(query.standard, query, limit);
      }

      // General search with filters
      return await this.generalSearch(query, limit);

    } catch (error) {
      console.error('Public certificate search error:', error);
      return {
        certificates: [],
        total: 0,
      };
    }
  }

  /**
   * Get certificate by number for public verification
   */
  async getCertificateByNumber(certificateNumber: string): Promise<PublicCertificate | null> {
    try {
      // First try exact match, then fallback to contains for debugging
      let command = new ScanCommand({
        TableName: CERTIFICATES_TABLE,
        FilterExpression: 'certificateNumber = :certNumber AND publiclySearchable = :public',
        ExpressionAttributeValues: {
          ':certNumber': certificateNumber,
          ':public': true,
        },
        Limit: 1,
      });

      let result = await docClient.send(command);
      
      // If exact match fails, try partial match for debugging
      if (!result.Items || result.Items.length === 0) {
        console.log('Exact match failed, trying partial match for certificate:', certificateNumber);
        command = new ScanCommand({
          TableName: CERTIFICATES_TABLE,
          FilterExpression: 'contains(certificateNumber, :partialNumber) AND publiclySearchable = :public',
          ExpressionAttributeValues: {
            ':partialNumber': certificateNumber.substring(0, 15), // First 15 chars
            ':public': true,
          },
        });
        
        result = await docClient.send(command);
        
        // Find exact match in results
        if (result.Items) {
          const exactMatch = result.Items.find(item => item.certificateNumber === certificateNumber);
          if (exactMatch) {
            return this.mapToPublicCertificate(exactMatch);
          }
        }
        
        return null;
      }

      return this.mapToPublicCertificate(result.Items[0]);

    } catch (error) {
      console.error('Get certificate by number error:', error);
      return null;
    }
  }

  /**
   * Verify certificate using verification code
   */
  async verifyCertificate(verificationCode: string): Promise<PublicCertificate | null> {
    try {
      const command = new ScanCommand({
        TableName: CERTIFICATES_TABLE,
        FilterExpression: 'verificationCode = :code AND publiclySearchable = :public',
        ExpressionAttributeValues: {
          ':code': verificationCode,
          ':public': true,
        },
        Limit: 1,
      });

      const result = await docClient.send(command);
      
      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.mapToPublicCertificate(result.Items[0]);

    } catch (error) {
      console.error('Certificate verification error:', error);
      return null;
    }
  }

  /**
   * Verify certificate with live blockchain verification
   */
  async verifyCertificateWithBlockchain(identifier: string, type: 'certificate_number' | 'verification_code' = 'certificate_number'): Promise<{
    certificate: PublicCertificate | null;
    blockchainVerification: {
      isValid: boolean;
      tezosVerified: boolean;
      etherlinkVerified: boolean;
      onChainData?: any;
      error?: string;
    };
  }> {
    let certificate = null;
    
    // Get certificate from database first
    if (type === 'certificate_number') {
      certificate = await this.getCertificateByNumber(identifier);
    } else {
      certificate = await this.verifyCertificate(identifier);
    }

    if (!certificate) {
      return {
        certificate: null,
        blockchainVerification: {
          isValid: false,
          tezosVerified: false,
          etherlinkVerified: false,
          error: 'Certificate not found in database',
        },
      };
    }

    // Perform blockchain verification
    let blockchainVerification = {
      isValid: false,
      tezosVerified: false,
      etherlinkVerified: false,
      error: 'Blockchain verification failed',
    };

    try {
      const blockchainResult = await blockchainService.verifyCertificate(certificate.id);
      blockchainVerification = {
        isValid: blockchainResult.isValid,
        tezosVerified: false, // Tezos verification not implemented in current blockchain service
        etherlinkVerified: blockchainResult.etherlinkVerified || false,
        ...(blockchainResult.onChainData && { onChainData: blockchainResult.onChainData }),
      };
    } catch (error) {
      console.warn('Blockchain verification failed:', error);
      blockchainVerification.error = error instanceof Error ? error.message : 'Unknown blockchain error';
    }

    return {
      certificate,
      blockchainVerification,
    };
  }

  /**
   * Get certificate statistics for public display
   */
  async getPublicStatistics(): Promise<{
    totalCertificates: number;
    activeCertificates: number;
    expiredCertificates: number;
    topStandards: Array<{ standard: string; count: number }>;
    topCountries: Array<{ country: string; count: number }>;
    recentCertificates: PublicCertificate[];
  }> {
    try {
      // Get recent certificates (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const command = new ScanCommand({
        TableName: CERTIFICATES_TABLE,
        FilterExpression: 'publiclySearchable = :public',
        ExpressionAttributeValues: {
          ':public': true,
        },
        Limit: 1000, // Sample for statistics
      });

      const result = await docClient.send(command);
      const certificates = result.Items || [];

      const now = new Date();
      const stats = {
        totalCertificates: certificates.length,
        activeCertificates: 0,
        expiredCertificates: 0,
        standards: {} as { [key: string]: number },
        countries: {} as { [key: string]: number },
        recentCertificates: [] as any[],
      };

      certificates.forEach(cert => {
        const expiryDate = new Date(cert.expiryDate);
        
        if (cert.status === 'valid') {
          if (expiryDate < now) {
            stats.expiredCertificates++;
          } else {
            stats.activeCertificates++;
          }
        }

        // Count by standard
        const standard = cert.standard?.number;
        if (standard) {
          stats.standards[standard] = (stats.standards[standard] || 0) + 1;
        }

        // Count by country
        const country = cert.organization?.address?.country;
        if (country) {
          stats.countries[country] = (stats.countries[country] || 0) + 1;
        }

        // Recent certificates
        const issuedDate = new Date(cert.issuedDate);
        if (issuedDate >= thirtyDaysAgo) {
          stats.recentCertificates.push(cert);
        }
      });

      // Sort and limit top stats
      const topStandards = Object.entries(stats.standards)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([standard, count]) => ({ standard, count }));

      const topCountries = Object.entries(stats.countries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([country, count]) => ({ country, count }));

      const recentCertificates = stats.recentCertificates
        .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
        .slice(0, 10)
        .map(cert => this.mapToPublicCertificate(cert));

      return {
        totalCertificates: stats.totalCertificates,
        activeCertificates: stats.activeCertificates,
        expiredCertificates: stats.expiredCertificates,
        topStandards,
        topCountries,
        recentCertificates,
      };

    } catch (error) {
      console.error('Get public statistics error:', error);
      return {
        totalCertificates: 0,
        activeCertificates: 0,
        expiredCertificates: 0,
        topStandards: [],
        topCountries: [],
        recentCertificates: [],
      };
    }
  }

  /**
   * Search by certificate number
   */
  private async searchByCertificateNumber(certificateNumber: string): Promise<PublicCertificateSearchResult> {
    const certificate = await this.getCertificateByNumber(certificateNumber);
    
    return {
      certificates: certificate ? [certificate] : [],
      total: certificate ? 1 : 0,
    };
  }

  /**
   * Search by organization name using GSI1
   */
  private async searchByOrganization(
    organizationName: string, 
    query: PublicCertificateSearchQuery, 
    limit: number
  ): Promise<PublicCertificateSearchResult> {
    const orgKey = organizationName.toLowerCase().replace(/\s+/g, '-');
    
    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: this.buildFilterExpression(query, true),
      ExpressionAttributeValues: {
        ':pk': `ORG#${orgKey}`,
        ...this.buildFilterValues(query, true),
      },
      Limit: limit,
    });

    const result = await docClient.send(command);
    const certificates = (result.Items || []).map(item => this.mapToPublicCertificate(item));

    return {
      certificates,
      total: certificates.length,
    };
  }

  /**
   * Search by standard using GSI2
   */
  private async searchByStandard(
    standard: string,
    query: PublicCertificateSearchQuery,
    limit: number
  ): Promise<PublicCertificateSearchResult> {
    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      FilterExpression: this.buildFilterExpression(query, true),
      ExpressionAttributeValues: {
        ':pk': `STANDARD#${standard}`,
        ...this.buildFilterValues(query, true),
      },
      Limit: limit,
    });

    const result = await docClient.send(command);
    const certificates = (result.Items || []).map(item => this.mapToPublicCertificate(item));

    return {
      certificates,
      total: certificates.length,
    };
  }

  /**
   * General search with scan
   */
  private async generalSearch(query: PublicCertificateSearchQuery, limit: number): Promise<PublicCertificateSearchResult> {
    const command = new ScanCommand({
      TableName: CERTIFICATES_TABLE,
      FilterExpression: this.buildFilterExpression(query, true),
      ExpressionAttributeValues: this.buildFilterValues(query, true),
      Limit: limit,
    });

    const result = await docClient.send(command);
    const certificates = (result.Items || []).map(item => this.mapToPublicCertificate(item));

    return {
      certificates,
      total: certificates.length,
    };
  }

  /**
   * Build filter expression for DynamoDB
   */
  private buildFilterExpression(query: PublicCertificateSearchQuery, includePublic = false): string {
    const filters = [];
    
    if (includePublic) {
      filters.push('publiclySearchable = :public');
    }
    
    if (query.country) {
      filters.push('contains(#orgAddress, :country)');
    }
    
    if (query.status) {
      filters.push('#status = :status');
    }
    
    if (query.issuedAfter) {
      filters.push('issuedDate >= :issuedAfter');
    }
    
    if (query.issuedBefore) {
      filters.push('issuedDate <= :issuedBefore');
    }
    
    if (query.expiryAfter) {
      filters.push('expiryDate >= :expiryAfter');
    }
    
    if (query.expiryBefore) {
      filters.push('expiryDate <= :expiryBefore');
    }

    return filters.join(' AND ');
  }

  /**
   * Build filter values for DynamoDB
   */
  private buildFilterValues(query: PublicCertificateSearchQuery, includePublic = false): Record<string, any> {
    const values: Record<string, any> = {};
    
    if (includePublic) {
      values[':public'] = true;
    }
    
    if (query.country) {
      values[':country'] = query.country;
    }
    
    if (query.status) {
      values[':status'] = query.status;
    }
    
    if (query.issuedAfter) {
      values[':issuedAfter'] = query.issuedAfter.toISOString();
    }
    
    if (query.issuedBefore) {
      values[':issuedBefore'] = query.issuedBefore.toISOString();
    }
    
    if (query.expiryAfter) {
      values[':expiryAfter'] = query.expiryAfter.toISOString();
    }
    
    if (query.expiryBefore) {
      values[':expiryBefore'] = query.expiryBefore.toISOString();
    }

    return values;
  }

  /**
   * Map DynamoDB item to public certificate (filtered data)
   */
  private mapToPublicCertificate(item: any): PublicCertificate {
    // Convert all Set objects to arrays recursively to fix Next.js serialization
    const sanitizedItem = this.convertSetsToArrays(item);
    
    // Simple date handling - DynamoDB stores ISO strings, just return them
    const expiryDate = new Date(sanitizedItem.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: sanitizedItem.id,
      certificateNumber: sanitizedItem.certificateNumber,
      issuerName: sanitizedItem.issuerName,
      organization: {
        name: sanitizedItem.organization.name,
        country: sanitizedItem.organization.address?.country || 'Unknown',
        city: sanitizedItem.organization.address?.city || 'Unknown',
      },
      standard: {
        number: sanitizedItem.standard?.number || '',
        title: sanitizedItem.standard?.title || '',
        category: sanitizedItem.standard?.category || '',
      },
      issuedDate: sanitizedItem.issuedDate,
      expiryDate: sanitizedItem.expiryDate,
      status: sanitizedItem.status,
      scope: {
        description: typeof sanitizedItem.scope === 'string' ? sanitizedItem.scope : sanitizedItem.scope?.description || '',
        sites: Array.isArray(sanitizedItem.scope?.sites)
          ? sanitizedItem.scope.sites.map((site: any) => ({
              name: site.name,
              city: site.address?.city || 'Unknown',
              country: site.address?.country || 'Unknown',
            }))
          : [],
      },
      verificationCode: sanitizedItem.metadata?.verificationCode || '',
      blockchain: {
        etherlinkTransactionHash: sanitizedItem.blockchain?.etherlinkTransactionHash,
        ipfsHash: sanitizedItem.blockchain?.ipfsHash,
        tezosTransactionHash: sanitizedItem.blockchain?.tezosTransactionHash,
      },
      isExpired: daysUntilExpiry <= 0,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
    };
  }

  /**
   * Recursively convert all Set objects to arrays for Next.js serialization
   */
  private convertSetsToArrays(obj: any): any {
    if (obj instanceof Set) {
      console.log('🔍 Found Set object, converting to array:', obj);
      return Array.from(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertSetsToArrays(item));
    }
    
    if (obj && typeof obj === 'object') {
      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertSetsToArrays(value);
      }
      return converted;
    }
    
    return obj;
  }
}

export const publicCertificateService = new PublicCertificateService();
