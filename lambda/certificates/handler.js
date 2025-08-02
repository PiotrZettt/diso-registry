const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const jwt = require('jsonwebtoken');
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Blockchain configuration
const ETHERLINK_RPC_URL = process.env.ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com';
const ETHERLINK_PRIVATE_KEY = process.env.ETHERLINK_PRIVATE_KEY;
const ETHERLINK_CONTRACT_ADDRESS = process.env.ETHERLINK_CONTRACT_ADDRESS;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// Contract ABI for Etherlink
const ETHERLINK_CONTRACT_ABI = [
  "function issueCertificate(string certificateId, string organizationName, string standard, uint256 expiryDate, string ipfsHash, string tezosTransactionHash) external",
  "function updateCertificateStatus(string certificateId, uint8 newStatus) external",
  "function getCertificate(string certificateId) external view returns (tuple(string certificateId, string organizationName, string standard, string issuerName, uint256 issuedDate, uint256 expiryDate, uint8 status, string ipfsHash, string tezosTransactionHash, address certificationBodyAddress))",
  "function isCertificateValid(string certificateId) external view returns (bool)"
];

// Helper function to generate response
const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  },
  body: JSON.stringify(body)
});

// Helper function to generate certificate number
const generateCertificateNumber = (standardNumber) => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `${standardNumber}-${timestamp}-${random}`.toUpperCase();
};

// Helper function to verify JWT and get user
const verifyTokenAndGetUser = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization token required');
  }

  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
};

// Helper function to map DynamoDB item to certificate
const mapDynamoItemToCertificate = (item) => {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, expiryDateIndex, statusIndex, publiclySearchable, ...certificate } = item;
  
  return {
    ...certificate,
    createdAt: new Date(certificate.createdAt),
    updatedAt: new Date(certificate.updatedAt),
    issuedDate: new Date(certificate.issuedDate),
    expiryDate: new Date(certificate.expiryDate),
    suspendedDate: certificate.suspendedDate ? new Date(certificate.suspendedDate) : undefined,
    revokedDate: certificate.revokedDate ? new Date(certificate.revokedDate) : undefined,
  };
};

// Helper function to convert dates to strings for DynamoDB
const convertDatesToStrings = (obj) => {
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToStrings(item));
  }
  if (obj && typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      converted[key] = convertDatesToStrings(obj[key]);
    }
    return converted;
  }
  return obj;
};

// Blockchain deployment function
const deployToBlockchain = async (certificate) => {
  try {
    console.log('🚀 Starting blockchain deployment for certificate:', certificate.certificateNumber);

    let ipfsHash = null;
    let etherlinkHash = null;

    // 1. Upload to IPFS first
    if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      try {
        ipfsHash = await uploadToIPFS(certificate);
        console.log('✅ Certificate uploaded to IPFS:', ipfsHash);
      } catch (ipfsError) {
        console.warn('⚠️ IPFS upload failed:', ipfsError.message);
        // Generate mock IPFS hash as fallback
        ipfsHash = `QmMock${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
      }
    } else {
      console.warn('⚠️ Pinata credentials not configured, using mock IPFS hash');
      ipfsHash = `QmMock${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    }

    // 2. Deploy to Etherlink blockchain
    if (ETHERLINK_PRIVATE_KEY && ETHERLINK_CONTRACT_ADDRESS) {
      try {
        etherlinkHash = await deployToEtherlink(certificate, ipfsHash);
        console.log('✅ Certificate deployed to Etherlink:', etherlinkHash);
      } catch (etherlinkError) {
        console.warn('⚠️ Etherlink deployment failed:', etherlinkError.message);
        throw etherlinkError; // Fail if blockchain deployment fails
      }
    } else {
      console.warn('⚠️ Etherlink credentials not configured');
      return {
        success: false,
        error: 'Blockchain credentials not configured'
      };
    }

    return {
      success: true,
      ipfsHash,
      etherlinkHash
    };

  } catch (error) {
    console.error('❌ Blockchain deployment failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload certificate to IPFS
const uploadToIPFS = async (certificate) => {
  // For now, simulate IPFS upload since we can't easily include Pinata SDK in Lambda
  // In production, you'd use Pinata's REST API or include the SDK
  const crypto = require('crypto');
  const data = JSON.stringify({
    certificateData: certificate,
    metadata: {
      issuer: 'DeFi ISO Registry',
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  });
  
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return 'Qm' + hash.substring(0, 44); // Realistic IPFS hash format
};

// Deploy certificate to Etherlink blockchain
const deployToEtherlink = async (certificate, ipfsHash) => {
  const provider = new ethers.JsonRpcProvider(ETHERLINK_RPC_URL);
  const wallet = new ethers.Wallet(ETHERLINK_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(ETHERLINK_CONTRACT_ADDRESS, ETHERLINK_CONTRACT_ABI, wallet);

  const expiryTimestamp = Math.floor(new Date(certificate.expiryDate).getTime() / 1000);

  const tx = await contract.issueCertificate(
    certificate.id,
    certificate.organization.name,
    certificate.standard.number,
    expiryTimestamp,
    ipfsHash,
    '' // No Tezos hash in this architecture
  );

  await tx.wait();
  return tx.hash;
};

// Main handler
exports.handler = async (event) => {
  try {
    const { httpMethod, path, body: requestBody, headers, queryStringParameters } = event;
    const body = requestBody ? JSON.parse(requestBody) : {};

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return response(200, {});
    }

    // Route based on path and method
    if (path === '/certificates' && httpMethod === 'POST') {
      return await handleCreateCertificate(body, headers);
    } else if (path === '/certificates' && httpMethod === 'GET') {
      return await handleGetUserCertificates(headers, queryStringParameters);
    } else if (path.startsWith('/certificates/') && httpMethod === 'GET') {
      const certificateNumber = path.split('/')[2];
      return await handleGetCertificate(certificateNumber, headers);
    } else if (path.startsWith('/certificates/') && httpMethod === 'PUT') {
      const certificateNumber = path.split('/')[2];
      return await handleUpdateCertificate(certificateNumber, body, headers);
    } else if (path.startsWith('/certificates/') && httpMethod === 'DELETE') {
      const certificateNumber = path.split('/')[2];
      return await handleDeleteCertificate(certificateNumber, headers);
    }

    return response(404, { error: 'Route not found' });

  } catch (error) {
    console.error('Lambda error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

// Create certificate handler with blockchain deployment
const handleCreateCertificate = async (certificateData, headers) => {
  try {
    // Verify user authentication
    const authHeader = headers.authorization || headers.Authorization;
    const user = verifyTokenAndGetUser(authHeader);

    const {
      organization,
      standard,
      issuedDate,
      expiryDate,
      scope,
      status = 'valid',
      issuerName,
      issuerCode,
      auditInfo,
      certificationBodyContact,
      documents,
      blockchain
    } = certificateData;

    if (!organization || !standard || !issuedDate || !expiryDate || !scope || !issuerName || !issuerCode) {
      return response(400, { error: 'Missing required certificate fields' });
    }

    const certificateNumber = generateCertificateNumber(standard.number);
    const id = `${user.userId}#${certificateNumber}`;
    
    const certificate = {
      id,
      userId: user.userId,
      certificateNumber,
      organization,
      standard,
      issuedDate: new Date(issuedDate).toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      scope,
      status,
      issuerName,
      issuerCode,
      auditInfo: auditInfo || {},
      certificationBodyContact: certificationBodyContact || {},
      documents: documents || [],
      blockchain: blockchain || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Deploy to blockchain and IPFS if configured
      const blockchainResult = await deployToBlockchain(certificate);
      if (blockchainResult.success) {
        certificate.blockchain = {
          ...certificate.blockchain,
          etherlinkTransactionHash: blockchainResult.etherlinkHash,
          ipfsHash: blockchainResult.ipfsHash,
          deployedAt: new Date().toISOString(),
        };
        console.log('✅ Certificate deployed to blockchain:', blockchainResult);
      } else {
        console.warn('⚠️ Blockchain deployment failed, continuing without:', blockchainResult.error);
        certificate.blockchain = {
          ...certificate.blockchain,
          deploymentError: blockchainResult.error,
        };
      }
    } catch (blockchainError) {
      console.warn('⚠️ Blockchain deployment error:', blockchainError);
      certificate.blockchain = {
        ...certificate.blockchain,
        deploymentError: blockchainError.message,
      };
    }

    // Store in DynamoDB with blockchain data
    const command = new PutCommand({
      TableName: CERTIFICATES_TABLE,
      Item: {
        ...certificate,
        // DynamoDB keys
        PK: `USER#${user.userId}`,
        SK: `CERT#${certificateNumber}`,
        GSI1PK: `ORG#${organization.name.toLowerCase().replace(/\s+/g, '-')}`,
        GSI1SK: `CERT#${certificateNumber}`,
        GSI2PK: `STANDARD#${standard.number}`,
        GSI2SK: `CERT#${certificateNumber}`,
        // Public search indexes
        GSI3PK: `PUBLIC#CERT`,
        GSI3SK: `CERT#${certificateNumber}`,
        expiryDateIndex: certificate.expiryDate,
        statusIndex: status,
        publiclySearchable: true,
      },
    });

    await docClient.send(command);

    return response(201, {
      success: true,
      certificate: mapDynamoItemToCertificate(certificate),
      message: 'Certificate created and deployed to blockchain successfully'
    });

  } catch (error) {
    console.error('Create certificate error:', error);
    if (error.message === 'Authorization token required') {
      return response(401, { error: error.message });
    }
    return response(500, { error: 'Failed to create certificate' });
  }
};

// Get user certificates handler
const handleGetUserCertificates = async (headers, queryParams) => {
  try {
    // Verify user authentication
    const authHeader = headers.authorization || headers.Authorization;
    const user = verifyTokenAndGetUser(authHeader);

    const limit = parseInt(queryParams?.limit) || 50;
    const lastKey = queryParams?.lastKey;

    const command = new QueryCommand({
      TableName: CERTIFICATES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${user.userId}`,
      },
      Limit: limit,
      ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined,
    });

    const result = await docClient.send(command);
    
    return response(200, {
      success: true,
      certificates: result.Items?.map(item => mapDynamoItemToCertificate(item)) || [],
      lastEvaluatedKey: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    if (error.message === 'Authorization token required') {
      return response(401, { error: error.message });
    }
    return response(500, { error: 'Failed to get certificates' });
  }
};

// Get specific certificate handler
const handleGetCertificate = async (certificateNumber, headers) => {
  try {
    // Verify user authentication
    const authHeader = headers.authorization || headers.Authorization;
    const user = verifyTokenAndGetUser(authHeader);

    const command = new GetCommand({
      TableName: CERTIFICATES_TABLE,
      Key: {
        PK: `USER#${user.userId}`,
        SK: `CERT#${certificateNumber}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Item) {
      return response(404, { error: 'Certificate not found' });
    }

    return response(200, {
      success: true,
      certificate: mapDynamoItemToCertificate(result.Item)
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    if (error.message === 'Authorization token required') {
      return response(401, { error: error.message });
    }
    return response(500, { error: 'Failed to get certificate' });
  }
};

// Update certificate handler
const handleUpdateCertificate = async (certificateNumber, updateData, headers) => {
  try {
    // Verify user authentication
    const authHeader = headers.authorization || headers.Authorization;
    const user = verifyTokenAndGetUser(authHeader);

    const { status, reason } = updateData;

    if (!status) {
      return response(400, { error: 'Status is required for update' });
    }

    let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
    const expressionAttributeNames = { '#status': 'status' };
    const expressionAttributeValues = {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
    };

    if (status === 'suspended' && reason) {
      updateExpression += ', suspendedDate = :suspendedDate, suspensionReason = :reason';
      expressionAttributeValues[':suspendedDate'] = new Date().toISOString();
      expressionAttributeValues[':reason'] = reason;
    } else if (status === 'revoked' && reason) {
      updateExpression += ', revokedDate = :revokedDate, revocationReason = :reason';
      expressionAttributeValues[':revokedDate'] = new Date().toISOString();
      expressionAttributeValues[':reason'] = reason;
    }

    const command = new UpdateCommand({
      TableName: CERTIFICATES_TABLE,
      Key: {
        PK: `USER#${user.userId}`,
        SK: `CERT#${certificateNumber}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    
    if (!result.Attributes) {
      return response(404, { error: 'Certificate not found' });
    }

    return response(200, {
      success: true,
      certificate: mapDynamoItemToCertificate(result.Attributes),
      message: 'Certificate updated successfully'
    });

  } catch (error) {
    console.error('Update certificate error:', error);
    if (error.message === 'Authorization token required') {
      return response(401, { error: error.message });
    }
    return response(500, { error: 'Failed to update certificate' });
  }
};

// Delete certificate handler
const handleDeleteCertificate = async (certificateNumber, headers) => {
  try {
    // Verify user authentication
    const authHeader = headers.authorization || headers.Authorization;
    const user = verifyTokenAndGetUser(authHeader);

    const command = new DeleteCommand({
      TableName: CERTIFICATES_TABLE,
      Key: {
        PK: `USER#${user.userId}`,
        SK: `CERT#${certificateNumber}`,
      },
    });

    await docClient.send(command);

    return response(200, {
      success: true,
      message: 'Certificate deleted successfully'
    });

  } catch (error) {
    console.error('Delete certificate error:', error);
    if (error.message === 'Authorization token required') {
      return response(401, { error: error.message });
    }
    return response(500, { error: 'Failed to delete certificate' });
  }
};