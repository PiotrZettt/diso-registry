# <span style="color: #10b981;">d</span><span style="color: #000000;">'</span><span style="color: #38bdf8;">ISO</span> Registry - Decentralized ISO Certification Platform

> **Solving Real-World Certification Trust Issues with Blockchain Technology**

A decentralized platform built on **Etherlink blockchain** that addresses the critical problem of ISO certificate verification and authenticity in global commerce. Our platform provides instant, immutable, and transparent certificate management for certification bodies worldwide.

## The Real-World Problem We Solve

### Fake ISO certificates - the scale of the problem (estimated)
**The International Accreditation Forum (IAF)** and other industry organizations indicate that:
Several to a dozen percent of certificates worldwide may be invalid, **fake, or issued by non-accredited bodies.**
- **In Asian countries**, and even parts of Central and Eastern Europe, this issue is relatively common.
- **Some industry estimates suggest** that up to 10–20% of ISO certificates in circulation may be unreliable (though not necessarily forged — some may appear legitimate but come from so-called "certificate factories").

### Types of fraud:

- **Fake documents** – certificates "issued" by non-existent entities.
- **Certificates without audits** – companies purchase an "ISO certificate" without meeting any actual requirements.
- **Non-accredited certification bodies** – formally issue certificates but are not recognized by the IAF (lack of independent accreditation).
- **Counterfeit** ISO or IAF logos on documents.

### Certificate Fraud & Verification Challenges
#### The International Accreditation Forum (IAF) and other industry organizations indicate that:
- **Several to a dozen percent** of certificates worldwide may be **invalid, fake, or issued by non-accredited bodies.**
- **Hours or days** required to verify certificate authenticity through traditional channels
- **No centralized, trustworthy database** for real-time certificate verification
- **High costs** for manual verification processes
- **Lack of transparency** in certification lifecycle management

### How d'ISO Registry Solves This
**Instant Verification** - Verify any ISO certificate in seconds, not days  
**Immutable Records** - Blockchain-backed certificates that cannot be forged  
**Global Accessibility** - 24/7 worldwide access to certificate verification  
**Cost-Effective** - Eliminate expensive manual verification processes  
**Complete Transparency** - Full audit trail of certificate lifecycle  
**Decentralized Trust** - No single point of failure or control  

## Why Etherlink Blockchain?

We chose **Etherlink** for several critical advantages that make real-world certificate management practical:

### **Speed & Efficiency**
- **Immediate transaction confirmation** - Certificates are verified in real-time
- **High throughput** - Can handle thousands of certificate operations per second
- **Low latency** - Users get instant feedback without waiting for block confirmations

### **Cost-Effective Operations**
- **Ultra-low gas fees** - Making certificate operations affordable for all organizations
- **Predictable costs** - Stable transaction fees enable accurate budgeting
- **Scalable pricing** - Cost doesn't increase with network congestion

### **Enterprise-Ready Security**
- **EVM compatibility** - Leverage battle-tested Ethereum security standards
- **Robust consensus** - Built on proven blockchain technology
- **Immutable records** - Once issued, certificates cannot be altered or deleted

### **Real-World Adoption**
- **Developer-friendly** - Easy integration with existing business systems
- **Web3 infrastructure** - Future-proof architecture for emerging technologies
- **Cross-chain compatibility** - Potential for multi-blockchain certificate networks

## Key Features

### For Certification Bodies
- **Certificate Issuance** - Create and deploy certificates directly to blockchain
- **Lifecycle Management** - Update, suspend, or revoke certificates as needed
- **Bulk Operations** - Handle multiple certificates efficiently
- **Custom Branding** - Multi-tenant architecture with personalized branding
- **Analytics Dashboard** - Track certificate usage and verification patterns

### For Certificate Holders
- **Instant Sharing** - Share verifiable certificates with stakeholders
- **Tamper-Proof Evidence** - Blockchain-backed proof of authenticity
- **Document Storage** - IPFS integration for secure document management

### For Verifiers (Public)
- **One-Click Verification** - Verify certificates instantly by number or QR code
- **Detailed Information** - Access complete certificate details and history
- **Blockchain Validation** - Real-time verification against blockchain records
- **Mobile-Friendly** - Verify certificates from any device, anywhere

## 🛠 Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain**: Etherlink Testnet, Smart Contracts (Solidity)
- **Storage**: IPFS via Pinata for document storage
- **Authentication**: JWT-based session management
- **Database**: AWS DynamoDB
- **Styling**: Shadcn/ui components, custom animations

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Git

### 1. Clone & Install
```bash
git clone <repository-url>
cd defiso
npm install
```

### 2. Environment Configuration
Create a `.env.local` file with the following variables:

```env
# Etherlink Blockchain Configuration
ETHERLINK_RPC_URL=https://node.ghostnet.etherlink.com
ETHERLINK_PRIVATE_KEY=your_private_key_here
ETHERLINK_CONTRACT_ADDRESS=your_deployed_contract_address

# IPFS Document Storage (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
IPFS_GATEWAY=https://gateway.pinata.cloud

# Application Security
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret

# Application URL
NEXTAUTH_URL=http://localhost:3000
```

### 3. Smart Contract Deployment (Optional)
If you need to deploy your own contract:

```bash
# The contract is already deployed on Etherlink Testnet
# Contract source: src/contracts/EtherlinkISORegistry.sol
# Default deployed address will be used if not specified in .env
```

### 4. Run Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## How to Use

### For Certification Bodies

1. **Access Portal** - Click "Certification Body" button on homepage
2. **Login/Register** - Create account or sign in
3. **Issue Certificates** - Use the dashboard to create new ISO certificates
4. **Manage Portfolio** - View, update, or revoke existing certificates
5. **Monitor Activity** - Track verification requests and usage analytics

### For Public Verification

1. **Visit Homepage** - Go to the main d'ISO Registry page
2. **Enter Certificate Details** - Input certificate number or verification code
3. **Instant Results** - Get immediate blockchain-verified results
4. **View Details** - Access complete certificate information and blockchain proof

## Security Features

- **Immutable Records** - All certificates permanently recorded on Etherlink blockchain
- **Cryptographic Verification** - Each certificate has unique blockchain signature
- **IPFS Storage** - Decentralized document storage prevents single points of failure

## Real-World Impact

### Industries Benefiting
- **Manufacturing** - ISO 9001 quality management verification
- **Healthcare** - ISO 13485 medical device standards
- **Information Security** - ISO 27001 security management
- **Environmental** - ISO 14001 environmental management
- **Food Safety** - ISO 22000 food safety management

### Business Benefits
- **Reduced Verification Time**: From days to seconds
- **Lower Operational Costs**: Eliminate manual verification processes
- **Increased Trust**: Blockchain-backed certificate authenticity
- **Global Reach**: 24/7 worldwide certificate verification
- **Compliance Support**: Immutable audit trails for regulatory requirements

## Performance & Scalability

- **Transaction Speed**: ~2-5 seconds on Etherlink
- **Cost per Certificate**: <$0.01 USD in gas fees
- **Throughput**: 1000+ certificates per minute
- **Uptime**: 99.9% blockchain availability
- **Global Access**: No geographical restrictions

## Blockchain Implementation

### Smart Contract Architecture

Our platform uses a comprehensive smart contract system deployed on Etherlink Testnet that handles the complete certificate lifecycle:

#### **Core Smart Contract**: `EtherlinkISORegistry.sol`
**Location**: [`src/contracts/EtherlinkISORegistry.sol`](src/contracts/EtherlinkISORegistry.sol)

**Key Functions:**
- `issueCertificate()` - Deploy new certificates to blockchain
- `updateCertificateStatus()` - Modify certificate status (suspend/revoke)
- `getCertificate()` - Retrieve certificate data and verify authenticity
- `isCertificateValid()` - Quick validation check
- `registerCertificationBody()` - Onboard new certification bodies

#### **Certificate Data Structure:**
```solidity
struct Certificate {
    string certificateId;
    string organizationName;
    string standard;
    string issuerName;
    uint256 issuedDate;
    uint256 expiryDate;
    uint8 status; // 0=valid, 1=suspended, 2=revoked, 3=expired
    string ipfsHash;
    string tezosTransactionHash;
    address certificationBodyAddress;
}
```

### Blockchain Integration Code

#### **Main Blockchain Service**
**Location**: [`src/services/blockchain-service.ts`](src/services/blockchain-service.ts)

This service handles all blockchain interactions:
- **Contract Deployment**: Automatic connection to Etherlink smart contract
- **Certificate Operations**: Issue, update, and verify certificates
- **Gas Management**: Optimized transaction handling for cost efficiency

#### **Key Integration Files:**

**1. Certificate Service Integration**
[`src/services/certificate-service.ts`](src/services/certificate-service.ts)
- Bridges UI operations with blockchain calls
- Handles certificate lifecycle management
- Integrates IPFS document storage with blockchain records

**2. Public Verification Service**
[`src/services/public-certificate-service.ts`](src/services/public-certificate-service.ts)
- Real-time blockchain verification
- Public certificate search and validation
- Cross-reference blockchain data with IPFS documents

**3. Blockchain Transaction Service**
[`src/services/blockchain-transaction-service.ts`](src/services/blockchain-transaction-service.ts)
- Transaction monitoring and status tracking
- Gas estimation and optimization
- Retry logic for failed transactions

### IPFS Integration

#### **Document Storage**
**Location**: [`src/services/pinata-service.ts`](src/services/pinata-service.ts)

**How it works:**
1. Certificate PDFs uploaded to IPFS via Pinata
2. IPFS hash stored in blockchain smart contract
3. Documents remain permanently accessible and tamper-proof
4. Real-time verification checks both blockchain and IPFS data integrity

### API Endpoints with Blockchain Integration

#### **Certificate Issuance**
[`src/app/api/certificates/issue/route.ts`](src/app/api/certificates/issue/route.ts)
- Validates certificate data
- Uploads documents to IPFS
- Deploys certificate to Etherlink blockchain
- Returns transaction hash and certificate details

#### **Public Verification**
[`src/app/api/public/certificates/verify/[identifier]/route.ts`](src/app/api/public/certificates/verify/[identifier]/route.ts)
- Queries blockchain for certificate data
- Verifies IPFS document integrity
- Returns comprehensive verification results
- Includes blockchain transaction proofs

### Blockchain Configuration

#### **Network Configuration**
**Location**: [`src/services/blockchain-service.ts`](src/services/blockchain-service.ts) (lines 559-577)

```typescript
const config: BlockchainConfig = {
  etherlink: {
    rpcUrl: process.env.ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com',
    privateKey: process.env.ETHERLINK_PRIVATE_KEY,
    contractAddress: process.env.ETHERLINK_CONTRACT_ADDRESS,
  },
  ipfs: {
    gateway: process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud',
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretKey: process.env.PINATA_SECRET_KEY,
  },
};
```

### Testing the Blockchain Integration

#### **Test Endpoints**
[`src/app/api/test-blockchain/balance/route.ts`](src/app/api/test-blockchain/balance/route.ts)
- Check Etherlink wallet balance
- Verify blockchain connectivity
- Test contract interaction

#### **Real-time Monitoring**
The platform includes comprehensive logging for all blockchain operations:
- Transaction hashes for complete audit trails
- Gas usage tracking for cost optimization
- Block confirmation monitoring
- Error logging with retry mechanisms

### Why This Implementation Works

1. **Immediate Finality**: Etherlink's fast confirmation times mean certificates are instantly verifiable
2. **Cost Efficiency**: Low gas fees make certificate operations affordable at scale
3. **Data Integrity**: Dual storage (blockchain + IPFS) ensures both metadata and documents are tamper-proof
4. **Scalability**: Smart contract architecture supports thousands of certificates without performance degradation
5. **Transparency**: All operations are publicly verifiable on the blockchain explorer

### Deployed Contract Information

- **Network**: Etherlink Testnet
- **Contract Address**: Available in environment configuration
- **Explorer**: View transactions on [Etherlink Explorer](https://testnet.explorer.etherlink.com)
- **RPC Endpoint**: `https://node.ghostnet.etherlink.com`

## License

This project is licensed under the MIT License.

*Making ISO certificate verification instant, trustworthy, and accessible to everyone, everywhere.*

**Built with ❤️ and 🤩 for Etherlink Hackathon, summer of Code 2025**

