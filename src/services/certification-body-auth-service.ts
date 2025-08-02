// Simplified authentication for Certification Bodies only
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { awsConfigService } from './aws-config-service';

let client: DynamoDBClient;
let docClient: DynamoDBDocumentClient;

async function initializeDynamoDBClient() {
  if (!client) {
    const config = await awsConfigService.getDynamoDBConfig();
    client = new DynamoDBClient({
      ...config,
      maxAttempts: 3,
      retryMode: 'adaptive',
    });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
  }
  return { client, docClient };
}
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
const USERS_TABLE = `${TABLE_PREFIX}-users`;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export interface CertificationBody {
  id: string;
  name: string;
  email: string;
  accreditationNumber: string; // Official accreditation number
  country: string;
  website?: string;
  logo?: string;
  contactPerson: {
    firstName: string;
    lastName: string;
    title: string;
    phone?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  accreditation: {
    accreditationBody: string; // e.g., "UKAS", "ANAB", "DAkkS"
    scope: string[]; // ISO standards they can certify
    validUntil: Date;
    certificateUrl?: string;
  };
  status: 'active' | 'pending' | 'suspended';
  blockchain: {
    walletAddress?: string;
    tezosContractAddress?: string;
    etherlinkContractAddress?: string;
  };
  settings: {
    autoPublishCertificates: boolean;
    requireDigitalSignature: boolean;
    defaultCertificateValidityYears: number;
  };
  statistics: {
    totalCertificatesIssued: number;
    activeCertificates: number;
    lastCertificateIssued?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  certificationBody?: Omit<CertificationBody, 'password'>;
  token?: string;
  message?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  accreditationNumber: string;
  country: string;
  website?: string;
  contactPerson: {
    firstName: string;
    lastName: string;
    title: string;
    phone?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  accreditation: {
    accreditationBody: string;
    scope: string[];
    validUntil: Date;
    certificateUrl?: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SimpleRegisterData {
  email: string;
  firstName: string;
  password: string;
  passwordConfirmation: string;
}

export class CertificationBodyAuthService {
  /**
   * Register a new certification body
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const { docClient } = await initializeDynamoDBClient();
    try {
      // Check if certification body already exists
      const existing = await this.getCertificationBodyByEmail(data.email);
      if (existing) {
        return {
          success: false,
          message: 'Certification body with this email already exists'
        };
      }

      // Check if accreditation number is already used
      const existingAccreditation = await this.getCertificationBodyByAccreditation(data.accreditationNumber);
      if (existingAccreditation) {
        return {
          success: false,
          message: 'This accreditation number is already registered'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create certification body
      const id = `CB-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const isDevEnvironment = process.env.NODE_ENV === 'development';
      const certificationBody: CertificationBody = {
        id,
        name: data.name,
        email: data.email,
        accreditationNumber: data.accreditationNumber,
        country: data.country,
        website: data.website,
        contactPerson: data.contactPerson,
        address: data.address,
        accreditation: data.accreditation,
        status: isDevEnvironment ? 'active' : 'pending', // Auto-approve in development
        blockchain: {
          walletAddress: undefined,
          tezosContractAddress: undefined,
          etherlinkContractAddress: undefined,
        },
        settings: {
          autoPublishCertificates: true,
          requireDigitalSignature: false,
          defaultCertificateValidityYears: 3,
        },
        statistics: {
          totalCertificatesIssued: 0,
          activeCertificates: 0,
          lastCertificateIssued: undefined,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: undefined,
      };

      // Store in DynamoDB
      const command = new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          ...certificationBody,
          password: hashedPassword,
          PK: 'CERTIFICATION_BODY',
          SK: `CB#${id}`,
          GSI1PK: `EMAIL#${data.email.toLowerCase()}`,
          GSI1SK: 'CERTIFICATION_BODY',
          emailIndex: data.email.toLowerCase(),
          countryIndex: data.country,
          accreditationNumber: data.accreditationNumber, // Store as regular attribute for scanning
        },
      });

      await docClient.send(command);

      const message = isDevEnvironment 
        ? 'Registration successful. Your account has been automatically approved for development testing.'
        : 'Registration successful. Your account is pending approval.';

      return {
        success: true,
        certificationBody,
        message
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login certification body
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      // Get certification body by email
      const cbWithPassword = await this.getCertificationBodyByEmailWithPassword(loginData.email);
      if (!cbWithPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check password
      const isValidPassword = await bcrypt.compare(loginData.password, cbWithPassword.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check status
      if (cbWithPassword.status !== 'active') {
        return {
          success: false,
          message: cbWithPassword.status === 'pending' 
            ? 'Your account is pending approval. Please contact support.'
            : 'Account is suspended. Please contact support.'
        };
      }

      // Update last login
      await this.updateLastLogin(cbWithPassword.id);

      // Generate JWT token
      const { password, ...certificationBody } = cbWithPassword;
      const token = this.generateJWT(certificationBody);

      return {
        success: true,
        certificationBody: { ...certificationBody, lastLoginAt: new Date() },
        token,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<CertificationBody | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const certificationBody = await this.getCertificationBodyById(decoded.certificationBodyId);
      
      if (!certificationBody || certificationBody.status !== 'active') {
        return null;
      }

      return certificationBody;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Get certification body by email
   */
  private async getCertificationBodyByEmail(email: string): Promise<CertificationBody | null> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${email.toLowerCase()}`,
        ':sk': 'CERTIFICATION_BODY',
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.mapDynamoItemToCertificationBody(result.Items[0]);
  }

  /**
   * Get certification body by accreditation number
   */
  private async getCertificationBodyByAccreditation(accreditationNumber: string): Promise<CertificationBody | null> {
    const { docClient } = await initializeDynamoDBClient();
    // Use scan operation to find by accreditation number since we only have GSI1
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'accreditationNumber = :accreditation',
      ExpressionAttributeValues: {
        ':pk': 'CERTIFICATION_BODY',
        ':accreditation': accreditationNumber,
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.mapDynamoItemToCertificationBody(result.Items[0]);
  }

  /**
   * Get certification body by email with password
   */
  private async getCertificationBodyByEmailWithPassword(email: string): Promise<(CertificationBody & { password: string }) | null> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${email.toLowerCase()}`,
        ':sk': 'CERTIFICATION_BODY',
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];
    const certificationBody = this.mapDynamoItemToCertificationBody(item);
    return { ...certificationBody, password: item.password };
  }

  /**
   * Get certification body by ID
   */
  private async getCertificationBodyById(id: string): Promise<CertificationBody | null> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: 'CERTIFICATION_BODY',
        SK: `CB#${id}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Item) {
      return null;
    }

    return this.mapDynamoItemToCertificationBody(result.Item);
  }

  /**
   * Update last login time
   */
  private async updateLastLogin(id: string): Promise<void> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: 'CERTIFICATION_BODY',
        SK: `CB#${id}`,
      },
      UpdateExpression: 'SET lastLoginAt = :lastLogin, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':lastLogin': new Date(),
        ':updatedAt': new Date(),
      },
    });

    await docClient.send(command);
  }

  /**
   * Generate JWT token
   */
  private generateJWT(certificationBody: CertificationBody): string {
    return jwt.sign(
      {
        certificationBodyId: certificationBody.id,
        name: certificationBody.name,
        email: certificationBody.email,
        accreditationNumber: certificationBody.accreditationNumber,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  /**
   * Map DynamoDB item to CertificationBody object
   */
  private mapDynamoItemToCertificationBody(item: any): CertificationBody {
    const { PK, SK, GSI1PK, GSI1SK, emailIndex, countryIndex, password, ...certificationBody } = item;
    
    return {
      ...certificationBody,
      createdAt: new Date(certificationBody.createdAt),
      updatedAt: new Date(certificationBody.updatedAt),
      lastLoginAt: certificationBody.lastLoginAt ? new Date(certificationBody.lastLoginAt) : undefined,
      accreditation: {
        ...certificationBody.accreditation,
        validUntil: new Date(certificationBody.accreditation.validUntil),
      },
      statistics: {
        ...certificationBody.statistics,
        lastCertificateIssued: certificationBody.statistics.lastCertificateIssued 
          ? new Date(certificationBody.statistics.lastCertificateIssued) 
          : undefined,
      },
    };
  }

  /**
   * Simplified registration for testing purposes
   * Only requires email, firstName, password, and passwordConfirmation
   */
  async simpleRegister(data: SimpleRegisterData): Promise<AuthResponse> {
    try {
      // Validate password confirmation
      if (data.password !== data.passwordConfirmation) {
        return {
          success: false,
          message: 'Password confirmation does not match'
        };
      }

      // Check if certification body already exists
      const existing = await this.getCertificationBodyByEmail(data.email);
      if (existing) {
        return {
          success: false,
          message: 'Account with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Generate ID
      const id = `CB-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const isDevEnvironment = process.env.NODE_ENV === 'development';
      
      // Create simplified certification body with defaults
      const certificationBody: CertificationBody = {
        id,
        name: `${data.firstName}'s Certification Body`, // Default name from firstName
        email: data.email,
        accreditationNumber: `TEST-${id.substring(3, 9)}`, // Auto-generated test accreditation
        country: 'Test Country',
        website: undefined,
        contactPerson: {
          firstName: data.firstName,
          lastName: 'Test User',
          title: 'Quality Manager',
          phone: undefined,
        },
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postalCode: '12345',
        },
        accreditation: {
          accreditationBody: 'TEST-ACCREDITATION',
          scope: ['ISO 9001'],
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
        status: isDevEnvironment ? 'active' : 'pending', // Auto-approve in development
        blockchain: {
          walletAddress: undefined,
          tezosContractAddress: undefined,
          etherlinkContractAddress: undefined,
        },
        settings: {
          autoPublishCertificates: true,
          requireDigitalSignature: false,
          defaultCertificateValidityYears: 3,
        },
        statistics: {
          totalCertificatesIssued: 0,
          activeCertificates: 0,
          lastCertificateIssued: undefined,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: undefined,
      };

      // Store in DynamoDB
      const command = new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          ...certificationBody,
          password: hashedPassword,
          PK: 'CERTIFICATION_BODY',
          SK: `CB#${id}`,
          GSI1PK: `EMAIL#${data.email.toLowerCase()}`,
          GSI1SK: 'CERTIFICATION_BODY',
          emailIndex: data.email.toLowerCase(),
          countryIndex: 'Test Country',
          accreditationNumber: certificationBody.accreditationNumber,
        },
      });

      await docClient.send(command);

      const message = isDevEnvironment 
        ? 'Registration successful! Your test account has been automatically approved.'
        : 'Registration successful. Your account is pending approval.';

      return {
        success: true,
        certificationBody,
        message
      };

    } catch (error) {
      console.error('Simple registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }
}

export const certificationBodyAuthService = new CertificationBodyAuthService();
