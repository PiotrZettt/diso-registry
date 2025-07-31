// Certificate service layer for DynamoDB operations
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ISOCertificate, CertificateStatus, ISOCategory } from '@/types/certificate';
import { generateCertificateNumber } from '@/lib/utils/certificate-utils';
import { blockchainService } from './blockchain-service';
import { BlockchainTransactionService } from './blockchain-transaction-service';
import pinataSDK from '@pinata/sdk';

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

export class CertificateService {
  private pinata: any;

  constructor() {
    // Initialize Pinata for IPFS uploads
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;
    
    if (apiKey && secretKey) {
      this.pinata = new pinataSDK(apiKey, secretKey);
      console.log('✅ Pinata service initialized for IPFS uploads');
    } else {
      console.warn('⚠️ Pinata credentials not found - IPFS uploads disabled');
    }
  }

  /**
   * Upload certificate document to IPFS via Pinata
   */
  private async uploadToIPFS(certificate: ISOCertificate): Promise<string | null> {
    if (!this.pinata) {
      console.warn('⚠️ Pinata not initialized - skipping IPFS upload');
      return null;
    }

    try {
      const certificateDocument = {
        certificateData: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          organization: {
            name: certificate.organization.name,
            address: certificate.organization.address,
            website: certificate.organization.website,
            contactPerson: certificate.organization.contactPerson,
            contactEmail: certificate.organization.contactEmail,
            contactPhone: certificate.organization.contactPhone,
          },
          standard: {
            number: certificate.standard.number,
            title: certificate.standard.title,
            version: certificate.standard.version,
            category: certificate.standard.category,
          },
          issuedDate: certificate.issuedDate.toISOString(),
          expiryDate: certificate.expiryDate.toISOString(),
          scope: certificate.scope,
          status: certificate.status,
          issuerName: certificate.issuerName,
          issuerCode: certificate.issuerCode,
          auditInfo: certificate.auditInfo,
          certificationBodyContact: certificate.certificationBodyContact,
          documents: certificate.documents,
        },
        metadata: {
          issuer: 'DeFi ISO Registry',
          timestamp: new Date().toISOString(),
          version: '1.0',
          tenantId: certificate.tenantId,
          blockchain: certificate.blockchain,
        },
      };

      console.log('📤 Uploading certificate to IPFS:', certificate.certificateNumber);

      const options = {
        pinataMetadata: {
          name: `certificate-${certificate.certificateNumber}-${Date.now()}`,
          keyvalues: {
            certificateId: certificate.id,
            certificateNumber: certificate.certificateNumber,
            organization: certificate.organization.name,
            standard: certificate.standard.number,
            tenantId: certificate.tenantId,
            type: 'iso-certificate',
            environment: process.env.NODE_ENV || 'development',
          },
        },
      };

      const result = await this.pinata.pinJSONToIPFS(certificateDocument, options);
      console.log('✅ Certificate uploaded to IPFS:', result.IpfsHash);

      return result.IpfsHash;
    } catch (error) {
      console.error('❌ Failed to upload certificate to IPFS:', error);
      return null;
    }
  }
  /**
   * Create a new certificate with blockchain integration
   */
  async createCertificate(tenantId: string, certificateData: Omit<ISOCertificate, 'id' | 'tenantId' | 'certificateNumber' | 'createdAt' | 'updatedAt'>): Promise<ISOCertificate> {
    const certificateNumber = generateCertificateNumber(certificateData.standard.number);
    const id = `${tenantId}#${certificateNumber}`;
    
    const certificate: ISOCertificate = {
      ...certificateData,
      id,
      tenantId,
      certificateNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Ensure dates are Date objects for blockchain service
      issuedDate: new Date(certificateData.issuedDate),
      expiryDate: new Date(certificateData.expiryDate),
    };

    try {
      // 1. Upload certificate document to IPFS first
      console.log('📤 Uploading certificate to IPFS:', certificate.id);
      const ipfsHash = await this.uploadToIPFS(certificate);
      
      if (ipfsHash) {
        // Update certificate with IPFS hash
        certificate.blockchain = {
          ...certificate.blockchain,
          ipfsHash,
        };
        console.log('✅ IPFS upload completed:', ipfsHash);
      }

      // 2. Issue certificate on blockchain with IPFS hash
      console.log('🚀 Issuing certificate to blockchain:', certificate.id);
      const blockchainResult = await blockchainService.issueCertificate(certificate);
      console.log('✅ Blockchain issuance completed:', blockchainResult);
      
      // 3. Store in database WITHOUT blockchain data (blockchain is the source of truth)
      const certificateForDb = this.convertDatesToStrings(certificate);
      
      const command = new PutCommand({
        TableName: CERTIFICATES_TABLE,
        Item: {
          ...certificateForDb,
          // DynamoDB keys
          PK: `TENANT#${tenantId}`,
          SK: `CERT#${certificateNumber}`,
          GSI1PK: `ORG#${certificateData.organization.name.toLowerCase().replace(/\s+/g, '-')}`,
          GSI1SK: `CERT#${certificateNumber}`,
          GSI2PK: `STANDARD#${certificateData.standard.number}`,
          GSI2SK: `CERT#${certificateNumber}`,
          expiryDateIndex: certificateForDb.expiryDate,
          statusIndex: certificateData.status,
          publiclySearchable: true,
        },
      });

      await docClient.send(command);

      console.log('✅ Certificate stored in database (blockchain is source of truth for verification)');

      // 3. Record blockchain transaction for audit trail
      const blockchainTxService = new BlockchainTransactionService();
      
      if (blockchainResult.etherlinkHash) {
        await blockchainTxService.recordTransaction({
          tenantId,
          certificateId: id,
          operationType: 'create_certificate',
          hash: blockchainResult.etherlinkHash,
          network: 'etherlink',
          status: 'pending',
          data: this.convertDatesToStrings(certificate),
        });
      }

      // Update certificate object with blockchain results for return
      certificate.blockchain = {
        etherlinkHash: blockchainResult.etherlinkHash,
        ipfsHash: blockchainResult.ipfsHash || certificate.blockchain.ipfsHash,
      };

      return certificate;

    } catch (error) {
      console.error('Certificate creation with blockchain failed:', error);
      
      // Fallback: Create certificate without blockchain (for development/testing)
      const certificateForDbFallback = this.convertDatesToStrings(certificate);
      
      const command = new PutCommand({
        TableName: CERTIFICATES_TABLE,
        Item: {
          ...certificateForDbFallback,
          PK: `TENANT#${tenantId}`,
          SK: `CERT#${certificateNumber}`,
          GSI1PK: `ORG#${certificateData.organization.name.toLowerCase().replace(/\s+/g, '-')}`,
          GSI1SK: `CERT#${certificateNumber}`,
          GSI2PK: `STANDARD#${certificateData.standard.number}`,
          GSI2SK: `CERT#${certificateNumber}`,
          expiryDateIndex: certificateForDbFallback.expiryDate,
          statusIndex: certificateData.status,
          publiclySearchable: true,
          blockchainError: error instanceof Error ? error.message : 'Unknown blockchain error',
        },
      });

      await docClient.send(command);
      return certificate;
    }
  }

  /**
   * Get certificate by tenant and certificate number
   */
  async getCertificate(tenantId: string, certificateNumber: string): Promise<ISOCertificate | null> {
    const command = new GetCommand({
      TableName: CERTIFICATES_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `CERT#${certificateNumber}`,
      },
    });

    const result = await docClient.send(command);
    return result.Item ? this.mapDynamoItemToCertificate(result.Item) : null;
  }

  /**
   * Get all certificates for a tenant
   */
  async getCertificatesByTenant(tenantId: string, limit = 50, lastKey?: string): Promise<{
    certificates: ISOCertificate[];
    lastEvaluatedKey?: string;
  }> {
    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined,
    });

    const result = await docClient.send(command);
    
    return {
      certificates: result.Items?.map(item => this.mapDynamoItemToCertificate(item)) || [],
      lastEvaluatedKey: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  /**
   * Get certificates by organization
   */
  async getCertificatesByOrganization(tenantId: string, organizationName: string, limit = 50): Promise<ISOCertificate[]> {
    const orgKey = organizationName.toLowerCase().replace(/\s+/g, '-');
    
    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':pk': `ORG#${orgKey}`,
        ':tenantId': tenantId,
      },
      Limit: limit,
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToCertificate(item)) || [];
  }

  /**
   * Get certificates by ISO standard
   */
  async getCertificatesByStandard(tenantId: string, standardNumber: string, limit = 50): Promise<ISOCertificate[]> {
    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      FilterExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':pk': `STANDARD#${standardNumber}`,
        ':tenantId': tenantId,
      },
      Limit: limit,
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToCertificate(item)) || [];
  }

  /**
   * Get expiring certificates
   */
  async getExpiringCertificates(tenantId: string, daysFromNow = 90): Promise<ISOCertificate[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);

    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'expiryDateIndex <= :expiryDate AND #status = :validStatus',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':expiryDate': expiryDate.toISOString(),
        ':validStatus': 'valid',
      },
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToCertificate(item)) || [];
  }

  /**
   * Update certificate status
   */
  /**
   * Update certificate status with blockchain integration
   */
  async updateCertificateStatus(tenantId: string, certificateNumber: string, status: CertificateStatus, reason?: string): Promise<ISOCertificate | null> {
    const certificateId = `${tenantId}#${certificateNumber}`;
    
    try {
      // 1. Update status on blockchain first
      const blockchainStatus = this.mapToBlockchainStatus(status);
      const blockchainTxHash = await blockchainService.updateCertificateStatus(certificateId, blockchainStatus);
      
      // 2. Update in database
      const updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
      const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
      const expressionAttributeValues: Record<string, any> = {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      };

      if (status === 'suspended' && reason) {
        updateExpression.concat(', suspendedDate = :suspendedDate, suspensionReason = :reason');
        expressionAttributeValues[':suspendedDate'] = new Date().toISOString();
        expressionAttributeValues[':reason'] = reason;
      } else if (status === 'revoked' && reason) {
        updateExpression.concat(', revokedDate = :revokedDate, revocationReason = :reason');
        expressionAttributeValues[':revokedDate'] = new Date().toISOString();
        expressionAttributeValues[':reason'] = reason;
      }

      const command = new UpdateCommand({
        TableName: CERTIFICATES_TABLE,
        Key: {
          PK: `TENANT#${tenantId}`,
          SK: `CERT#${certificateNumber}`,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const result = await docClient.send(command);
      
      // 3. Record blockchain transaction
      if (blockchainTxHash) {
        const blockchainTxService = new BlockchainTransactionService();
        await blockchainTxService.recordTransaction({
          tenantId,
          certificateId,
          operationType: 'update_status',
          hash: blockchainTxHash,
          network: 'etherlink',
          status: 'pending',
          data: { status, reason },
        });
      }

      return result.Attributes ? this.mapDynamoItemToCertificate(result.Attributes) : null;

    } catch (error) {
      console.error('Certificate status update with blockchain failed:', error);
      
      // Fallback: Update only in database
      const updateExpression = 'SET #status = :status, updatedAt = :updatedAt, blockchainError = :blockchainError';
      const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
      const expressionAttributeValues: Record<string, any> = {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
        ':blockchainError': error instanceof Error ? error.message : 'Unknown blockchain error',
      };

      if (status === 'suspended' && reason) {
        updateExpression.concat(', suspendedDate = :suspendedDate, suspensionReason = :reason');
        expressionAttributeValues[':suspendedDate'] = new Date().toISOString();
        expressionAttributeValues[':reason'] = reason;
      } else if (status === 'revoked' && reason) {
        updateExpression.concat(', revokedDate = :revokedDate, revocationReason = :reason');
        expressionAttributeValues[':revokedDate'] = new Date().toISOString();
        expressionAttributeValues[':reason'] = reason;
      }

      const command = new UpdateCommand({
        TableName: CERTIFICATES_TABLE,
        Key: {
          PK: `TENANT#${tenantId}`,
          SK: `CERT#${certificateNumber}`,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const result = await docClient.send(command);
      return result.Attributes ? this.mapDynamoItemToCertificate(result.Attributes) : null;
    }
  }

  /**
   * Search certificates
   */
  async searchCertificates(tenantId: string, query: {
    organizationName?: string;
    standard?: string;
    status?: CertificateStatus;
    expiryDateBefore?: Date;
    expiryDateAfter?: Date;
  }, limit = 50): Promise<ISOCertificate[]> {
    let filterExpression = 'tenantId = :tenantId';
    const expressionAttributeValues: Record<string, any> = {
      ':tenantId': tenantId,
    };

    if (query.organizationName) {
      filterExpression += ' AND contains(#orgName, :orgName)';
      expressionAttributeValues[':orgName'] = query.organizationName.toLowerCase();
    }

    if (query.standard) {
      filterExpression += ' AND #standard = :standard';
      expressionAttributeValues[':standard'] = query.standard;
    }

    if (query.status) {
      filterExpression += ' AND #status = :status';
      expressionAttributeValues[':status'] = query.status;
    }

    if (query.expiryDateBefore) {
      filterExpression += ' AND expiryDateIndex <= :expiryBefore';
      expressionAttributeValues[':expiryBefore'] = query.expiryDateBefore.toISOString();
    }

    if (query.expiryDateAfter) {
      filterExpression += ' AND expiryDateIndex >= :expiryAfter';
      expressionAttributeValues[':expiryAfter'] = query.expiryDateAfter.toISOString();
    }

    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#orgName': 'organization.name',
        '#standard': 'standard.number',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ...expressionAttributeValues,
      },
      Limit: limit,
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToCertificate(item)) || [];
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(tenantId: string, certificateNumber: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: CERTIFICATES_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `CERT#${certificateNumber}`,
      },
    });

    try {
      await docClient.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      return false;
    }
  }

  /**
   * Get certificate statistics for tenant
   */
  async getCertificateStats(tenantId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    suspended: number;
    revoked: number;
    byStandard: Record<string, number>;
  }> {
    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
      },
    });

    const result = await docClient.send(command);
    const certificates = result.Items?.map(item => this.mapDynamoItemToCertificate(item)) || [];

    const now = new Date();
    const expiringSoonDate = new Date();
    expiringSoonDate.setDate(now.getDate() + 90);

    const stats = {
      total: certificates.length,
      active: 0,
      expired: 0,
      expiringSoon: 0,
      suspended: 0,
      revoked: 0,
      byStandard: {} as Record<string, number>,
    };

    certificates.forEach(cert => {
      // Status counts
      if (cert.status === 'valid') {
        stats.active++;
        if (cert.expiryDate < now) {
          stats.expired++;
        } else if (cert.expiryDate < expiringSoonDate) {
          stats.expiringSoon++;
        }
      } else if (cert.status === 'suspended') {
        stats.suspended++;
      } else if (cert.status === 'revoked') {
        stats.revoked++;
      }

      // Standard counts
      const standard = cert.standard.number;
      stats.byStandard[standard] = (stats.byStandard[standard] || 0) + 1;
    });

    return stats;
  }

  /**
   * Map certificate status to blockchain status
   */
  private mapToBlockchainStatus(status: CertificateStatus): 'valid' | 'suspended' | 'revoked' | 'expired' {
    switch (status) {
      case 'valid':
        return 'valid';
      case 'suspended':
        return 'suspended';
      case 'revoked':
        return 'revoked';
      case 'expired':
        return 'expired';
      case 'pending':
        return 'valid'; // Pending certificates are treated as valid on blockchain
      default:
        return 'valid';
    }
  }

  /**
   * Map DynamoDB item to certificate
   */
  private mapDynamoItemToCertificate(item: any): ISOCertificate {
    // Convert all Set objects to arrays recursively to fix Next.js serialization
    const sanitizedItem = this.convertSetsToArrays(item);
    
    return {
      ...sanitizedItem,
      createdAt: new Date(sanitizedItem.createdAt),
      updatedAt: new Date(sanitizedItem.updatedAt),
      issuedDate: new Date(sanitizedItem.issuedDate),
      expiryDate: new Date(sanitizedItem.expiryDate),
      suspendedDate: sanitizedItem.suspendedDate ? new Date(sanitizedItem.suspendedDate) : undefined,
      revokedDate: sanitizedItem.revokedDate ? new Date(sanitizedItem.revokedDate) : undefined,
    };
  }

  /**
   * Recursively convert all Set objects to arrays for Next.js serialization
   */
  private convertSetsToArrays(obj: any): any {
    if (obj instanceof Set) {
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

  /**
   * Convert Date objects to ISO strings recursively
   */
  private convertDatesToStrings(obj: any): any {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDatesToStrings(item));
    }
    if (obj && typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        converted[key] = this.convertDatesToStrings(obj[key]);
      }
      return converted;
    }
    return obj;
  }
}

export const certificateService = new CertificateService();
