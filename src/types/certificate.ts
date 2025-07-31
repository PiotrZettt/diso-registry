// ISO Certificate type definitions for dISO Registry

export interface ISOCertificate {
  id: string;
  certificationBodyId: string; // Which certification body issued this certificate
  issuedByUserId: string; // Which user from the certification body issued it
  
  // Certificate identification
  certificateNumber: string;
  issuerName: string;
  issuerCode: string;
  
  // Organization details
  organization: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    website?: string;
    email?: string;
    phone?: string;
  };
  
  // ISO Standard details
  standard: {
    number: string; // e.g., "9001", "14001", "27001"
    title: string;
    version: string;
    category: ISOCategory;
  };
  
  // Certificate lifecycle
  issuedDate: Date;
  expiryDate: Date;
  suspendedDate?: Date;
  revokedDate?: Date;
  status: CertificateStatus;
  
  // Audit information
  auditInfo: {
    auditDate: Date;
    auditorName: string;
    auditType: 'initial' | 'surveillance' | 'recertification';
    nextAuditDate?: Date;
  };
  
  // Scope of certification
  scope: {
    description: string;
    sites: CertificationSite[];
    processes: string[];
    exclusions?: string[];
  };
  
  // Blockchain references
  blockchain: {
    tezosTransactionHash?: string;
    etherlinkTransactionHash?: string;
    ipfsHash?: string; // For certificate documents
    merkleRoot?: string; // For batch operations
  };
  
  // Documents
  documents: {
    certificateUrl?: string;
    auditReportUrl?: string;
    supportingDocuments?: string[];
  };
  
  // Metadata
  metadata: {
    createdBy: string; // User ID who created this certificate
    lastUpdatedBy: string; // User ID who last updated
    publiclySearchable: boolean;
    verificationCode: string; // For public verification
    tags: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificationSite {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  isPrimary: boolean;
  activities: string[];
}

export type CertificateStatus = 
  | 'valid'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'pending'
  | 'draft';

export type ISOCategory = 
  | 'quality_management'      // ISO 9001
  | 'environmental'          // ISO 14001
  | 'information_security'   // ISO 27001
  | 'occupational_health'    // ISO 45001
  | 'energy_management'      // ISO 50001
  | 'food_safety'           // ISO 22000
  | 'automotive'            // ISO/TS 16949
  | 'aerospace'             // AS9100
  | 'medical_devices'       // ISO 13485
  | 'other';

export interface CertificateSearchQuery {
  certificationBodyId?: string; // For certification body-specific searches
  issuedByUserId?: string; // For user-specific searches
  organizationName?: string;
  certificateNumber?: string;
  standard?: string;
  category?: ISOCategory;
  status?: CertificateStatus;
  country?: string;
  city?: string;
  issuedAfter?: Date;
  issuedBefore?: Date;
  expiryAfter?: Date;
  expiryBefore?: Date;
  publicOnly?: boolean; // For public searches
}

export interface CertificateSearchResult {
  certificates: ISOCertificate[];
  total: number;
  page: number;
  limit: number;
  facets?: {
    categories: { [key: string]: number };
    countries: { [key: string]: number };
    statuses: { [key: string]: number };
  };
}

export interface CertificateValidationResult {
  isValid: boolean;
  certificate?: ISOCertificate;
  status: CertificateStatus;
  verificationDate: Date;
  errors?: string[];
  warnings?: string[];
}

// Bulk operations for certification bodies
export interface BulkCertificateOperation {
  id: string;
  certificationBodyId: string;
  operationType: 'create' | 'update' | 'suspend' | 'revoke';
  certificates: Partial<ISOCertificate>[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: {
    successful: number;
    failed: number;
    errors: string[];
  };
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}
