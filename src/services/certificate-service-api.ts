// Certificate service using API Gateway/Lambda backend
import { apiClient } from './api-client';

export interface Certificate {
  id: string;
  userId: string;
  certificateNumber: string;
  organization: {
    name: string;
    address: string;
    website?: string;
    email?: string;
    phone?: string;
  };
  standard: {
    number: string;
    title: string;
    version: string;
    category: string;
  };
  issuedDate: Date;
  expiryDate: Date;
  scope: string;
  status: 'valid' | 'suspended' | 'revoked' | 'expired' | 'pending';
  issuerName: string;
  issuerCode: string;
  auditInfo?: any;
  certificationBodyContact?: any;
  documents?: any[];
  blockchain?: any;
  suspendedDate?: Date;
  revokedDate?: Date;
  suspensionReason?: string;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateCreateData {
  organization: {
    name: string;
    address: string;
    website?: string;
    email?: string;
    phone?: string;
  };
  standard: {
    number: string;
    title: string;
    version: string;
    category: string;
  };
  issuedDate: Date | string;
  expiryDate: Date | string;
  scope: string;
  status?: 'valid' | 'suspended' | 'revoked' | 'expired' | 'pending';
  issuerName: string;
  issuerCode: string;
  auditInfo?: any;
  certificationBodyContact?: any;
  documents?: any[];
  blockchain?: any;
}

export interface CertificateResponse {
  success: boolean;
  certificate?: Certificate;
  certificates?: Certificate[];
  lastEvaluatedKey?: string;
  message?: string;
  error?: string;
}

export class CertificateServiceAPI {
  /**
   * Create a new certificate
   */
  async createCertificate(certificateData: CertificateCreateData): Promise<CertificateResponse> {
    try {
      const response = await apiClient.createCertificate(certificateData);
      
      if (response.success && response.data) {
        return {
          success: true,
          certificate: this.mapResponseToCertificate((response.data as any).certificate),
          message: (response.data as any).message || 'Certificate created successfully'
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to create certificate'
      };
    } catch (error) {
      console.error('Create certificate error:', error);
      return {
        success: false,
        error: 'Failed to create certificate'
      };
    }
  }

  /**
   * Get all certificates for the authenticated user
   */
  async getCertificates(params?: { limit?: number; lastKey?: string }): Promise<CertificateResponse> {
    try {
      const response = await apiClient.getCertificates(params);
      
      if (response.success && response.data) {
        return {
          success: true,
          certificates: (response.data as any).certificates?.map((cert: any) => this.mapResponseToCertificate(cert)) || [],
          lastEvaluatedKey: (response.data as any).lastEvaluatedKey
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to get certificates'
      };
    } catch (error) {
      console.error('Get certificates error:', error);
      return {
        success: false,
        error: 'Failed to get certificates'
      };
    }
  }

  /**
   * Get a specific certificate by certificate number
   */
  async getCertificate(certificateNumber: string): Promise<CertificateResponse> {
    try {
      const response = await apiClient.getCertificate(certificateNumber);
      
      if (response.success && response.data) {
        return {
          success: true,
          certificate: this.mapResponseToCertificate((response.data as any).certificate)
        };
      }

      return {
        success: false,
        error: response.error || 'Certificate not found'
      };
    } catch (error) {
      console.error('Get certificate error:', error);
      return {
        success: false,
        error: 'Failed to get certificate'
      };
    }
  }

  /**
   * Update certificate status
   */
  async updateCertificateStatus(
    certificateNumber: string,
    status: 'valid' | 'suspended' | 'revoked' | 'expired',
    reason?: string
  ): Promise<CertificateResponse> {
    try {
      const response = await apiClient.updateCertificate(certificateNumber, { status, reason });
      
      if (response.success && response.data) {
        return {
          success: true,
          certificate: this.mapResponseToCertificate((response.data as any).certificate),
          message: (response.data as any).message || 'Certificate updated successfully'
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to update certificate'
      };
    } catch (error) {
      console.error('Update certificate error:', error);
      return {
        success: false,
        error: 'Failed to update certificate'
      };
    }
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(certificateNumber: string): Promise<CertificateResponse> {
    try {
      const response = await apiClient.deleteCertificate(certificateNumber);
      
      if (response.success) {
        return {
          success: true,
          message: (response.data as any)?.message || 'Certificate deleted successfully'
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to delete certificate'
      };
    } catch (error) {
      console.error('Delete certificate error:', error);
      return {
        success: false,
        error: 'Failed to delete certificate'
      };
    }
  }

  /**
   * Get certificate statistics
   */
  async getCertificateStats(): Promise<{
    success: boolean;
    stats?: {
      total: number;
      active: number;
      expired: number;
      expiringSoon: number;
      suspended: number;
      revoked: number;
      byStandard: Record<string, number>;
    };
    error?: string;
  }> {
    try {
      // Get all certificates and calculate stats on the frontend
      const response = await this.getCertificates({ limit: 1000 }); // Get a large number
      
      if (!response.success || !response.certificates) {
        return {
          success: false,
          error: response.error || 'Failed to get certificates for stats'
        };
      }

      const certificates = response.certificates;
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

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Get certificate stats error:', error);
      return {
        success: false,
        error: 'Failed to get certificate statistics'
      };
    }
  }

  /**
   * Map API response to Certificate object
   */
  private mapResponseToCertificate(certData: any): Certificate {
    return {
      ...certData,
      issuedDate: new Date(certData.issuedDate),
      expiryDate: new Date(certData.expiryDate),
      createdAt: new Date(certData.createdAt),
      updatedAt: new Date(certData.updatedAt),
      suspendedDate: certData.suspendedDate ? new Date(certData.suspendedDate) : undefined,
      revokedDate: certData.revokedDate ? new Date(certData.revokedDate) : undefined,
    };
  }
}

export const certificateServiceAPI = new CertificateServiceAPI();