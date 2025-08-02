const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { ethers } = require('ethers');

// Initialize DynamoDB client using IAM role (secure)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-2'
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
const CERTIFICATES_TABLE = `${TABLE_PREFIX}-certificates`;

// Blockchain configuration
const ETHERLINK_RPC_URL = process.env.ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com';
const ETHERLINK_CONTRACT_ADDRESS = process.env.ETHERLINK_CONTRACT_ADDRESS;

// Contract ABI for verification
const ETHERLINK_CONTRACT_ABI = [
  "function getCertificate(string certificateId) external view returns (tuple(string certificateId, string organizationName, string standard, string issuerName, uint256 issuedDate, uint256 expiryDate, uint8 status, string ipfsHash, string tezosTransactionHash, address certificationBodyAddress))",
  "function isCertificateValid(string certificateId) external view returns (bool)"
];

// Helper function to generate response
const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  },
  body: JSON.stringify(body)
});

// Helper function to map DynamoDB item to certificate (public view)
const mapDynamoItemToCertificate = (item) => {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, userId, ...certificate } = item;
  
  return {
    ...certificate,
    // Remove private user data for public view
    issuedDate: new Date(certificate.issuedDate),
    expiryDate: new Date(certificate.expiryDate),
    createdAt: new Date(certificate.createdAt),
    updatedAt: new Date(certificate.updatedAt),
    suspendedDate: certificate.suspendedDate ? new Date(certificate.suspendedDate) : undefined,
    revokedDate: certificate.revokedDate ? new Date(certificate.revokedDate) : undefined,
  };
};

// Main handler
exports.handler = async (event) => {
  try {
    const { httpMethod, path, queryStringParameters } = event;

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return response(200, {});
    }

    // Route based on path and method
    if (path === '/public/certificates/search' && httpMethod === 'GET') {
      return await handleSearchCertificates(queryStringParameters);
    } else if (path.startsWith('/public/certificates/verify/') && httpMethod === 'GET') {
      const certificateNumber = path.split('/')[4];
      return await handleVerifyCertificate(certificateNumber);
    } else if (path === '/public/certificates' && httpMethod === 'GET') {
      return await handleGetPublicCertificates(queryStringParameters);
    }

    return response(404, { error: 'Route not found' });

  } catch (error) {
    console.error('Lambda error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

// Search certificates handler
const handleSearchCertificates = async (queryParams) => {
  try {
    const {
      organization,
      standard,
      status = 'valid',
      limit = '50'
    } = queryParams || {};

    let command;

    if (organization) {
      // Search by organization
      const orgKey = organization.toLowerCase().replace(/\s+/g, '-');
      command = new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: '#status = :status AND publiclySearchable = :public',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pk': `ORG#${orgKey}`,
          ':status': status,
          ':public': true,
        },
        Limit: parseInt(limit),
      });
    } else if (standard) {
      // Search by standard
      command = new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        FilterExpression: '#status = :status AND publiclySearchable = :public',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pk': `STANDARD#${standard}`,
          ':status': status,
          ':public': true,
        },
        Limit: parseInt(limit),
      });
    } else {
      // General search of all public certificates
      command = new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pk': 'PUBLIC#CERT',
          ':status': status,
        },
        Limit: parseInt(limit),
      });
    }

    const result = await docClient.send(command);
    
    return response(200, {
      success: true,
      certificates: result.Items?.map(item => mapDynamoItemToCertificate(item)) || [],
      count: result.Items?.length || 0
    });

  } catch (error) {
    console.error('Search certificates error:', error);
    return response(500, { error: 'Failed to search certificates' });
  }
};

// Get public certificates handler (paginated list)
const handleGetPublicCertificates = async (queryParams) => {
  try {
    const {
      limit = '50',
      status = 'valid',
      lastKey
    } = queryParams || {};

    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': 'PUBLIC#CERT',
        ':status': status,
      },
      Limit: parseInt(limit),
      ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined,
    });

    const result = await docClient.send(command);
    
    return response(200, {
      success: true,
      certificates: result.Items?.map(item => mapDynamoItemToCertificate(item)) || [],
      count: result.Items?.length || 0,
      lastEvaluatedKey: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    });

  } catch (error) {
    console.error('Get public certificates error:', error);
    return response(500, { error: 'Failed to get public certificates' });
  }
};

// Verify certificate handler
const handleVerifyCertificate = async (certificateNumber) => {
  try {
    console.log('🔍 Verifying certificate:', certificateNumber);

    // 1. Get certificate from database
    let dbCertificate = null;
    try {
      const command = new QueryCommand({
        TableName: CERTIFICATES_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        FilterExpression: 'begins_with(certificateNumber, :certNum)',
        ExpressionAttributeValues: {
          ':pk': 'PUBLIC#CERT',
          ':certNum': certificateNumber,
        },
        Limit: 1,
      });

      const result = await docClient.send(command);
      if (result.Items && result.Items.length > 0) {
        dbCertificate = mapDynamoItemToCertificate(result.Items[0]);
        console.log('✅ Certificate found in database');
      } else {
        console.log('❌ Certificate not found in database');
      }
    } catch (dbError) {
      console.warn('⚠️ Database lookup failed:', dbError.message);
    }

    // 2. Verify on blockchain if available
    let blockchainVerification = null;
    if (ETHERLINK_CONTRACT_ADDRESS && dbCertificate?.blockchain?.etherlinkTransactionHash) {
      try {
        blockchainVerification = await verifyOnBlockchain(dbCertificate.id);
        console.log('✅ Blockchain verification completed');
      } catch (blockchainError) {
        console.warn('⚠️ Blockchain verification failed:', blockchainError.message);
        blockchainVerification = {
          verified: false,
          error: blockchainError.message
        };
      }
    }

    // 3. Compile verification results
    const verification = {
      certificateNumber,
      found: !!dbCertificate,
      certificate: dbCertificate,
      verification: {
        database: {
          verified: !!dbCertificate,
          timestamp: new Date().toISOString(),
        },
        blockchain: blockchainVerification || {
          verified: false,
          reason: 'Blockchain verification not available'
        },
        overall: {
          verified: !!dbCertificate && (blockchainVerification?.verified !== false),
          status: dbCertificate?.status || 'not_found',
          isExpired: dbCertificate ? new Date() > new Date(dbCertificate.expiryDate) : false,
        }
      }
    };

    return response(200, {
      success: true,
      verification
    });

  } catch (error) {
    console.error('Verify certificate error:', error);
    return response(500, { error: 'Failed to verify certificate' });
  }
};

// Verify certificate on blockchain
const verifyOnBlockchain = async (certificateId) => {
  const provider = new ethers.JsonRpcProvider(ETHERLINK_RPC_URL);
  const contract = new ethers.Contract(ETHERLINK_CONTRACT_ADDRESS, ETHERLINK_CONTRACT_ABI, provider);

  try {
    console.log('🔗 Checking blockchain for certificate:', certificateId);
    
    const isValid = await contract.isCertificateValid(certificateId);
    
    if (isValid) {
      const certificateData = await contract.getCertificate(certificateId);
      
      return {
        verified: true,
        onChainData: {
          certificateId: certificateData.certificateId,
          organizationName: certificateData.organizationName,
          standard: certificateData.standard,
          issuerName: certificateData.issuerName,
          issuedDate: new Date(Number(certificateData.issuedDate) * 1000),
          expiryDate: new Date(Number(certificateData.expiryDate) * 1000),
          status: Number(certificateData.status),
          ipfsHash: certificateData.ipfsHash,
          certificationBodyAddress: certificateData.certificationBodyAddress
        },
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        verified: false,
        reason: 'Certificate not found on blockchain',
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('❌ Blockchain verification failed:', error);
    throw error;
  }
};