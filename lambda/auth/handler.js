const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');

// Initialize DynamoDB client using IAM role (secure)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-2'
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
const USERS_TABLE = `${TABLE_PREFIX}-users`;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

// Helper function to get user by email
const getUserByEmail = async (email) => {
  const command = new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :email',
    ExpressionAttributeValues: {
      ':email': `EMAIL#${email.toLowerCase()}`,
    },
  });

  const result = await docClient.send(command);
  return result.Items?.[0] || null;
};

// Helper function to generate JWT
const generateJWT = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Helper function to get default permissions
const getDefaultPermissions = (role) => {
  switch (role) {
    case 'admin':
      return [
        'certificates.create',
        'certificates.read',
        'certificates.update',
        'certificates.delete',
        'users.invite',
        'users.manage',
        'settings.manage',
      ];
    case 'certification_body':
      return [
        'certificates.create',
        'certificates.read',
        'certificates.update',
        'certificates.delete',
      ];
    case 'auditor':
      return [
        'certificates.create',
        'certificates.read',
        'certificates.update',
      ];
    case 'operator':
      return [
        'certificates.read',
        'certificates.update',
      ];
    case 'viewer':
    default:
      return ['certificates.read'];
  }
};

// Helper function to map DynamoDB item to user
const mapDynamoItemToUser = (item) => {
  const { PK, SK, GSI1PK, GSI1SK, emailIndex, password, ...user } = item;
  
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
  };
};

// Main handler
exports.handler = async (event) => {
  try {
    const { httpMethod, path, body: requestBody, headers } = event;
    const body = requestBody ? JSON.parse(requestBody) : {};

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return response(200, {});
    }

    // Route based on path and method
    if (path === '/auth/register' && httpMethod === 'POST') {
      return await handleRegister(body);
    } else if (path === '/auth/login' && httpMethod === 'POST') {
      return await handleLogin(body);
    } else if (path === '/auth/me' && httpMethod === 'GET') {
      return await handleGetMe(headers);
    } else if (path === '/auth/logout' && httpMethod === 'POST') {
      return await handleLogout();
    }

    return response(404, { error: 'Route not found' });

  } catch (error) {
    console.error('Lambda error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

// Register handler
const handleRegister = async (userData) => {
  try {
    const { email, password, firstName, lastName, role = 'viewer' } = userData;

    if (!email || !password || !firstName || !lastName) {
      return response(400, { error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return response(400, { error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = `user#${Date.now()}#${Math.random().toString(36).substring(2)}`;
    const user = {
      id: userId,
      email,
      firstName,
      lastName,
      role,
      status: 'active',
      emailVerified: false,
      settings: {
        notifications: {
          email: true,
          certificateExpiry: true,
          auditReminders: true,
        },
        language: 'en',
        timezone: 'UTC',
      },
      profile: {
        phone: undefined,
        title: undefined,
        department: undefined,
        avatar: undefined,
      },
      permissions: getDefaultPermissions(role),
      lastLoginAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store user in DynamoDB
    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        ...user,
        password: hashedPassword,
        PK: `USER#${userId}`,
        SK: `USER#${userId}`,
        GSI1PK: `EMAIL#${email.toLowerCase()}`,
        GSI1SK: `USER#${userId}`,
        emailIndex: email.toLowerCase(),
      },
    });

    await docClient.send(command);

    // Generate JWT token
    const token = generateJWT(user);

    return response(201, {
      success: true,
      user,
      token,
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return response(500, { error: 'Registration failed' });
  }
};

// Login handler
const handleLogin = async (loginData) => {
  try {
    const { email, password } = loginData;

    if (!email || !password) {
      return response(400, { error: 'Email and password are required' });
    }

    // Get user by email
    const userWithPassword = await getUserByEmail(email);
    if (!userWithPassword) {
      return response(401, { error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, userWithPassword.password);
    if (!isValidPassword) {
      return response(401, { error: 'Invalid email or password' });
    }

    // Check user status
    if (userWithPassword.status !== 'active') {
      return response(401, { error: 'Account is not active' });
    }

    // Update last login
    const updateCommand = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: userWithPassword.PK,
        SK: userWithPassword.SK,
      },
      UpdateExpression: 'SET lastLoginAt = :lastLogin, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':lastLogin': new Date().toISOString(),
        ':updatedAt': new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);

    // Generate JWT token
    const { password: _, ...user } = userWithPassword;
    const userMapped = mapDynamoItemToUser(user);
    const token = generateJWT(userMapped);

    return response(200, {
      success: true,
      user: { ...userMapped, lastLoginAt: new Date() },
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return response(500, { error: 'Login failed' });
  }
};

// Get current user handler
const handleGetMe = async (headers) => {
  try {
    // Get token from Authorization header
    const authHeader = headers.authorization || headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response(401, { error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `USER#${decoded.userId}`,
        SK: `USER#${decoded.userId}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Item || result.Item.status !== 'active') {
      return response(401, { error: 'User not found or inactive' });
    }

    const user = mapDynamoItemToUser(result.Item);

    return response(200, {
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    return response(401, { error: 'Invalid token' });
  }
};

// Logout handler
const handleLogout = async () => {
  // For JWT tokens, logout is handled client-side by removing the token
  return response(200, {
    success: true,
    message: 'Logged out successfully'
  });
};