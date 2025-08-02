// Type aliases for blockchain transaction and network
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type BlockchainNetwork = 'tezos' | 'etherlink';
export type OperationType = 'create_certificate' | 'update_status' | 'create_tenant' | 'update_tenant';

// Blockchain integration types for Tezos and Etherlink
import { CertificateStatus } from './certificate';

export interface BlockchainConfig {
  tezos: {
    network: 'mainnet' | 'ghostnet' | 'localhost';
    rpcUrl: string;
    contractAddress?: string;
  };
  etherlink: {
    network: 'mainnet' | 'testnet' | 'localhost';
    rpcUrl: string;
    contractAddress?: string;
    chainId: number;
  };
}

export interface TezosContractStorage {
  admin: string;
  paused: boolean;
  certificates: Map<string, CertificateRecord>;
  tenants: Map<string, TenantRecord>;
  nextCertificateId: number;
}

export interface CertificateRecord {
  id: string;
  tenantId: string;
  certificateHash: string; // Hash of certificate data
  ipfsHash: string;
  issuer: string;
  organization: string;
  standard: string;
  issuedDate: string; // ISO date string
  expiryDate: string;
  status: number; // 0=valid, 1=suspended, 2=revoked
  createdAt: string;
}

export interface TenantRecord {
  id: string;
  contractAddress: string; // Tenant-specific contract
  admin: string; // Tenant admin wallet
  isActive: boolean;
  certificateCount: number;
}

export interface BlockchainTransaction {
  id: string;
  tenantId: string;
  operationType: 'create_certificate' | 'update_status' | 'create_tenant' | 'update_tenant';
  hash: string;
  network: 'tezos' | 'etherlink';
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  blockchainTxHash?: string;
  gasUsed?: number;
  fee?: string;
  data: Record<string, unknown>;
  certificateId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
}

export interface ContractMethod {
  name: string;
  parameters: Record<string, unknown>[];
  gasLimit?: number;
  storageLimit?: number;
}

export interface WalletConnection {
  address: string;
  network: string;
  balance?: string;
  isConnected: boolean;
  provider: 'beacon' | 'temple' | 'kukai' | 'metamask';
}

// Smart contract interfaces
export interface RegistryContract {
  // Certificate operations
  createCertificate(
    tenantId: string,
    certificateData: CertificateData,
    ipfsHash: string
  ): Promise<string>;
  
  updateCertificateStatus(
    certificateId: string,
    status: CertificateStatus,
    reason?: string
  ): Promise<string>;
  
  getCertificate(certificateId: string): Promise<CertificateRecord>;
  
  // Tenant operations
  createTenant(
    tenantId: string,
    admin: string,
    contractAddress: string
  ): Promise<string>;
  
  updateTenant(
    tenantId: string,
    updates: Partial<TenantRecord>
  ): Promise<string>;
  
  // Query operations
  getCertificatesByTenant(tenantId: string): Promise<CertificateRecord[]>;
  getTenant(tenantId: string): Promise<TenantRecord>;
}

export interface CertificateData {
  organizationName: string;
  standard: string;
  issuedDate: Date;
  expiryDate: Date;
  issuer: string;
  scope: string;
}

// IPFS integration
export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IPFSDocument {
  hash: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  tenantId: string;
  certificateId?: string;
}

// Multi-signature operations
export interface MultiSigOperation {
  id: string;
  tenantId: string;
  type: 'create_certificate' | 'revoke_certificate' | 'update_tenant';
  data: Record<string, unknown>;
  requiredSignatures: number;
  signatures: MultiSigSignature[];
  status: 'pending' | 'executed' | 'rejected';
  expiresAt: Date;
  createdBy: string;
  createdAt: Date;
}

export interface MultiSigSignature {
  signer: string;
  signature: string;
  signedAt: Date;
}

export interface BlockchainEventLog {
  id: string;
  tenantId: string;
  transactionHash: string;
  blockNumber: number;
  eventName: string;
  data: Record<string, unknown>;
  timestamp: Date;
}
