import pinataSDK from '@pinata/sdk';

export interface PinataUploadResult {
  success: boolean;
  ipfsHash?: string;
  pinSize?: number;
  timestamp?: string;
  error?: string;
}

export interface CertificateDocument {
  certificateData: {
    id: string;
    certificateNumber: string;
    organization: {
      name: string;
      address?: string;
      country?: string;
    };
    standard: {
      number: string;
      title: string;
    };
    issuedDate: string;
    expiryDate: string;
    scope: string;
    status: 'valid' | 'suspended' | 'revoked';
    certificationBodyInfo: {
      name: string;
      accreditationNumber: string;
      address?: string;
    };
  };
  metadata: {
    issuer: string;
    timestamp: string;
    version: string;
    blockchain: {
      tezosHash?: string;
      etherlinkHash?: string;
    };
  };
}

export class PinataService {
  private pinata: any;
  private initialized = false;

  constructor() {
    this.initializePinata();
  }

  private initializePinata() {
    try {
      const apiKey = process.env.PINATA_API_KEY;
      const secretKey = process.env.PINATA_SECRET_KEY;

      if (!apiKey || !secretKey) {
        console.warn('⚠️ Pinata credentials not found in environment variables');
        return;
      }

      this.pinata = new pinataSDK(apiKey, secretKey);
      this.initialized = true;
      console.log('✅ Pinata service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Pinata:', error);
    }
  }

  /**
   * Test Pinata connection and authentication
   */
  async testAuthentication(): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'Pinata not initialized' };
    }

    try {
      const result = await this.pinata.testAuthentication();
      return { success: result.authenticated };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Upload certificate document to IPFS via Pinata
   */
  async uploadCertificate(
    certificateData: CertificateDocument,
    options: {
      pinName?: string;
      metadata?: { [key: string]: unknown };
    } = {}
  ): Promise<PinataUploadResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Pinata service not initialized. Check API credentials.',
      };
    }

    try {
      const pinName = options.pinName || `certificate-${certificateData.certificateData.certificateNumber}-${Date.now()}`;
      
      const pinataOptions = {
        pinataMetadata: {
          name: pinName,
          keyvalues: {
            certificateId: certificateData.certificateData.id,
            certificateNumber: certificateData.certificateData.certificateNumber,
            organization: certificateData.certificateData.organization.name,
            standard: certificateData.certificateData.standard.number,
            issuer: certificateData.certificateData.certificationBodyInfo.name,
            type: 'iso-certificate',
            version: certificateData.metadata.version,
            ...options.metadata,
          },
        },
      };

      console.log(`📤 Uploading certificate ${certificateData.certificateData.certificateNumber} to IPFS...`);
      
      const result = await this.pinata.pinJSONToIPFS(certificateData, pinataOptions);
      
      console.log(`✅ Certificate uploaded successfully: ${result.IpfsHash}`);
      
      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
      };
    } catch (error) {
      console.error('❌ Failed to upload certificate to IPFS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Pin existing content by IPFS hash
   */
  async pinByHash(
    ipfsHash: string,
    options: {
      pinName?: string;
      metadata?: { [key: string]: unknown };
    } = {}
  ): Promise<PinataUploadResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Pinata service not initialized',
      };
    }

    try {
      const pinataOptions = {
        pinataMetadata: {
          name: options.pinName || `pinned-content-${Date.now()}`,
          keyvalues: options.metadata || {},
        },
      };

      const result = await this.pinata.pinByHash(ipfsHash, pinataOptions);
      
      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pin by hash failed',
      };
    }
  }

  /**
   * Get pin list with filtering options
   */
  async getPinList(filters: {
    certificateId?: string;
    organizationName?: string;
    standard?: string;
    limit?: number;
  } = {}): Promise<{
    success: boolean;
    pins?: Array<Record<string, unknown>>;
    error?: string;
  }> {
    if (!this.initialized) {
      return { success: false, error: 'Pinata service not initialized' };
    }

    try {
      const pinataFilters: Record<string, unknown> = {
        status: 'pinned',
        pageLimit: filters.limit || 100,
      };

      // Add metadata filters
      if (filters.certificateId) {
        pinataFilters.metadata = {
          ...pinataFilters.metadata,
          keyvalues: {
            certificateId: {
              value: filters.certificateId,
              op: 'eq',
            },
          },
        };
      }

      const result = await this.pinata.pinList(pinataFilters);
      
      return {
        success: true,
        pins: result.rows,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pin list',
      };
    }
  }

  /**
   * Unpin content from IPFS
   */
  async unpinContent(ipfsHash: string): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'Pinata service not initialized' };
    }

    try {
      await this.pinata.unpin(ipfsHash);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpin content',
      };
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(): Promise<{
    success: boolean;
    data?: {
      pinCount: number;
      pinSizeTotal: number;
      pinSizeWithReplicationsTotal: number;
    };
    error?: string;
  }> {
    if (!this.initialized) {
      return { success: false, error: 'Pinata service not initialized' };
    }

    try {
      const result = await this.pinata.userPinTotalSize();
      return {
        success: true,
        data: {
          pinCount: result.pin_count,
          pinSizeTotal: result.pin_size_total,
          pinSizeWithReplicationsTotal: result.pin_size_with_replications_total,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage statistics',
      };
    }
  }

  /**
   * Create a properly formatted certificate document for IPFS upload
   */
  createCertificateDocument(
    certificateData: Record<string, unknown>,
    certificationBodyInfo: Record<string, unknown>,
    blockchainHashes: { tezosHash?: string; etherlinkHash?: string } = {}
  ): CertificateDocument {
    return {
      certificateData: {
        id: certificateData.id,
        certificateNumber: certificateData.certificateNumber,
        organization: {
          name: certificateData.organizationName,
          address: certificateData.organizationAddress,
          country: certificateData.organizationCountry,
        },
        standard: {
          number: certificateData.standard,
          title: this.getStandardTitle(certificateData.standard),
        },
        issuedDate: certificateData.issuedDate,
        expiryDate: certificateData.expiryDate,
        scope: certificateData.scope || 'General scope',
        status: 'valid',
        certificationBodyInfo: {
          name: certificationBodyInfo.name,
          accreditationNumber: certificationBodyInfo.accreditationNumber,
          address: certificationBodyInfo.address,
        },
      },
      metadata: {
        issuer: certificationBodyInfo.name,
        timestamp: new Date().toISOString(),
        version: '1.0',
        blockchain: blockchainHashes,
      },
    };
  }

  private getStandardTitle(standardNumber: string): string {
    const standardTitles: { [key: string]: string } = {
      '9001': 'Quality Management Systems',
      '14001': 'Environmental Management Systems',
      '45001': 'Occupational Health and Safety Management Systems',
      '27001': 'Information Security Management Systems',
      '22000': 'Food Safety Management Systems',
      '50001': 'Energy Management Systems',
    };

    return standardTitles[standardNumber] || `ISO ${standardNumber}`;
  }
}

export const pinataService = new PinataService();