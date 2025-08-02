// IPFS Service for certificate document verification and retrieval
export interface IPFSVerificationResult {
  success: boolean;
  data?: Record<string, unknown>;
  _error?: string;
  gateway?: string;
  contentType?: string;
}

export interface IPFSGateway {
  url: string;
  name: string;
  timeout: number;
}

export class IPFSService {
  private static readonly GATEWAYS: IPFSGateway[] = [
    { url: 'https://gateway.pinata.cloud', name: 'Pinata', timeout: 10000 },
    { url: 'https://ipfs.io', name: 'IPFS.io', timeout: 15000 },
    { url: 'https://cloudflare-ipfs.com', name: 'Cloudflare', timeout: 10000 },
    { url: 'https://gateway.ipfs.io', name: 'Protocol Labs', timeout: 15000 },
  ];

  /**
   * Retrieve certificate data from IPFS using multiple gateway fallbacks
   */
  async retrieveCertificate(ipfsHash: string): Promise<IPFSVerificationResult> {
    if (!ipfsHash || !this.isValidIPFSHash(ipfsHash)) {
      return {
        success: false,
        _error: 'Invalid IPFS hash format',
      };
    }

    // If it's a mock hash, return mock data
    if (ipfsHash.startsWith('QmCert') || ipfsHash.includes('mock')) {
      return this.getMockCertificateData(ipfsHash);
    }

    // Try each gateway in order
    for (const gateway of IPFSService.GATEWAYS) {
      try {
        console.log(`Attempting to retrieve ${ipfsHash} from ${gateway.name}...`);
        
        const result = await this.fetchFromGateway(gateway, ipfsHash);
        if (result.success) {
          console.log(`Successfully retrieved from ${gateway.name}`);
          return result;
        }
      } catch (__error) {
        console.warn(`Failed to retrieve from ${gateway.name}:`, __error);
        continue;
      }
    }

    return {
      success: false,
      _error: 'Failed to retrieve certificate from all IPFS gateways',
    };
  }

  /**
   * Verify certificate integrity by comparing with blockchain data
   */
  async verifyCertificateIntegrity(ipfsHash: string, expectedData: Record<string, unknown>): Promise<{
    valid: boolean;
    matches: boolean;
    retrievedData?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const retrievalResult = await this.retrieveCertificate(ipfsHash);
      
      if (!retrievalResult.success) {
        return {
          valid: false,
          matches: false,
          error: retrievalResult._error,
        };
      }

      const retrievedData = retrievalResult.data;
      
      // Compare key fields to verify integrity
      const matches = retrievedData ? this.compareCertificateData(retrievedData, expectedData) : false;
      
      return {
        valid: true,
        matches,
        retrievedData,
      };
    } catch (__error) {
      return {
        valid: false,
        matches: false,
        error: __error instanceof Error ? __error.message : 'Verification failed',
      };
    }
  }

  /**
   * Get IPFS gateway status for monitoring
   */
  async getGatewayStatus(): Promise<Array<{
    gateway: string;
    status: 'online' | 'offline' | 'slow';
    responseTime: number;
  }>> {
    const testHash = 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'; // Well-known test hash
    const results: Array<{
      gateway: string;
      status: 'online' | 'offline' | 'slow';
      responseTime: number;
    }> = [];

    for (const gateway of IPFSService.GATEWAYS) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), gateway.timeout);
        
        const response = await fetch(`${gateway.url}/ipfs/${testHash}`, {
          signal: controller.signal,
          method: 'HEAD', // Just check if accessible
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        results.push({
          gateway: gateway.name,
          status: response.ok ? (responseTime > 5000 ? 'slow' : 'online') : 'offline',
          responseTime,
        });
      } catch (__error) {
        const responseTime = Date.now() - startTime;
        results.push({
          gateway: gateway.name,
          status: 'offline',
          responseTime,
        });
      }
    }

    return results;
  }

  private async fetchFromGateway(gateway: IPFSGateway, ipfsHash: string): Promise<IPFSVerificationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), gateway.timeout);
    
    try {
      const url = `${gateway.url}/ipfs/${ipfsHash}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      const data = await response.json();
      
      return {
        success: true,
        data,
        gateway: gateway.name,
        contentType,
      };
    } catch (__error) {
      clearTimeout(timeoutId);
      throw __error;
    }
  }

  private isValidIPFSHash(hash: string): boolean {
    // Basic IPFS hash validation (Qm... format for v0 hashes)
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || 
           hash.startsWith('QmCert') || 
           hash.startsWith('QmTest') ||
           hash.includes('mock');
  }

  private getMockCertificateData(ipfsHash: string): IPFSVerificationResult {
    // Return mock data for testing
    const mockData = {
      certificateData: {
        id: 'test-cert-blockchain-123',
        certificateNumber: 'TEST-BLOCKCHAIN-001',
        organization: {
          name: 'Test Organization Ltd',
        },
        standard: {
          number: '9001',
          title: 'Quality Management Systems',
        },
        issuedDate: '2025-07-25T19:30:38.131Z',
        expiryDate: '2026-07-25T19:30:38.132Z',
        scope: 'Design, manufacture and supply of test products',
        status: 'valid',
      },
      metadata: {
        issuer: 'Test Certification Body',
        timestamp: new Date().toISOString(),
        ipfsHash,
      },
    };

    return {
      success: true,
      data: mockData,
      gateway: 'Mock',
      contentType: 'application/json',
    };
  }

  private compareCertificateData(retrieved: Record<string, unknown>, expected: Record<string, unknown>): boolean {
    try {
      // Compare key fields that should match
      const retrievedCert = (retrieved.certificateData || retrieved) as Record<string, unknown>;
      const expectedCert = expected as Record<string, unknown>;
      
      return (
        retrievedCert.id === expectedCert.id &&
        retrievedCert.certificateNumber === expectedCert.certificateNumber &&
        (retrievedCert.organization as Record<string, unknown>)?.name === (expectedCert.organization as Record<string, unknown>)?.name &&
        (retrievedCert.standard as Record<string, unknown>)?.number === (expectedCert.standard as Record<string, unknown>)?.number
      );
    } catch (__error) {
      console.warn('Error comparing certificate data:', __error);
      return false;
    }
  }
}

export const ipfsService = new IPFSService();