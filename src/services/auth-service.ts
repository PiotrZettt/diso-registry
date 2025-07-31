// Authentication service for multitenant user management
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TenantUser, TenantInvitation, UserRole } from '@/types/tenant';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-2',
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
const USERS_TABLE = `${TABLE_PREFIX}-users`;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthResponse {
  success: boolean;
  user?: TenantUser;
  token?: string;
  message?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  invitationToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(tenantId: string, userData: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(tenantId, userData.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Validate invitation token if provided
      let invitation: TenantInvitation | null = null;
      if (userData.invitationToken) {
        invitation = await this.getInvitationByToken(tenantId, userData.invitationToken);
        if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
          return {
            success: false,
            message: 'Invalid or expired invitation token'
          };
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const userId = `${tenantId}#${Date.now()}#${Math.random().toString(36).substring(2)}`;
      const user: TenantUser = {
        id: userId,
        tenantId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: (invitation?.role || userData.role || 'viewer') as UserRole,
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
        permissions: this.getDefaultPermissions(invitation?.role || userData.role || 'viewer'),
        lastLoginAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store user in DynamoDB
      const command = new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          ...user,
          password: hashedPassword,
          PK: `TENANT#${tenantId}`,
          SK: `USER#${userId}`,
          GSI1PK: `EMAIL#${userData.email.toLowerCase()}`,
          GSI1SK: `TENANT#${tenantId}`,
          emailIndex: userData.email.toLowerCase(),
        },
      });

      await docClient.send(command);

      // Mark invitation as accepted if it exists
      if (invitation) {
        await this.updateInvitationStatus(tenantId, invitation.id, 'accepted');
      }

      // Generate JWT token
      const token = this.generateJWT(user);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword as TenantUser,
        token,
        message: 'User registered successfully'
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
   * Login user
   */
  async login(tenantId: string, loginData: LoginData): Promise<AuthResponse> {
    try {
      // Get user by email
      const userWithPassword = await this.getUserByEmailWithPassword(tenantId, loginData.email);
      if (!userWithPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check password
      const isValidPassword = await bcrypt.compare(loginData.password, userWithPassword.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check user status
      if (userWithPassword.status !== 'active') {
        return {
          success: false,
          message: 'Account is not active. Please contact your administrator.'
        };
      }

      // Update last login
      await this.updateLastLogin(tenantId, userWithPassword.id);

      // Generate JWT token
      const { password, ...user } = userWithPassword;
      const token = this.generateJWT(user as TenantUser);

      return {
        success: true,
        user: { ...user, lastLoginAt: new Date() } as TenantUser,
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
  async verifyToken(token: string): Promise<TenantUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await this.getUserById(decoded.tenantId, decoded.userId);
      
      if (!user || user.status !== 'active') {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Get authenticated user from request
   */
  async getAuthenticatedUser(request: any): Promise<TenantUser | null> {
    try {
      // Try to get token from Authorization header
      const authHeader = request.headers.get('authorization');
      let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      
      // If no Bearer token, try to get from cookies
      if (!token) {
        const cookies = request.headers.get('cookie');
        if (cookies) {
          const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
          if (authCookie) {
            token = authCookie.split('=')[1];
          }
        }
      }

      if (!token) {
        return null;
      }

      return await this.verifyToken(token);
    } catch (error) {
      console.error('Get authenticated user error:', error);
      return null;
    }
  }

  /**
   * Create invitation for new user
   */
  async createInvitation(
    tenantId: string,
    email: string,
    role: UserRole,
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: TenantInvitation; message?: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(tenantId, email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Check for existing pending invitation
      const existingInvitation = await this.getPendingInvitationByEmail(tenantId, email);
      if (existingInvitation) {
        return {
          success: false,
          message: 'Invitation already sent to this email'
        };
      }

      // Create invitation
      const invitationId = `${tenantId}#${Date.now()}#${Math.random().toString(36).substring(2)}`;
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation: TenantInvitation = {
        id: invitationId,
        tenantId,
        email: email.toLowerCase(),
        role,
        token,
        status: 'pending',
        invitedBy,
        expiresAt,
        createdAt: new Date(),
      };

      // Store invitation
      const command = new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          ...invitation,
          PK: `TENANT#${tenantId}`,
          SK: `INVITATION#${invitationId}`,
          GSI1PK: `INVITATION_EMAIL#${email.toLowerCase()}`,
          GSI1SK: `TENANT#${tenantId}`,
          tokenIndex: token,
        },
      });

      await docClient.send(command);

      return {
        success: true,
        invitation,
        message: 'Invitation created successfully'
      };

    } catch (error) {
      console.error('Invitation creation error:', error);
      return {
        success: false,
        message: 'Failed to create invitation'
      };
    }
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(tenantId: string, email: string): Promise<TenantUser | null> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :tenant',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${email.toLowerCase()}`,
        ':tenant': `TENANT#${tenantId}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.mapDynamoItemToUser(result.Items[0]);
  }

  /**
   * Get user by email with password (for login)
   */
  private async getUserByEmailWithPassword(tenantId: string, email: string): Promise<(TenantUser & { password: string }) | null> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :tenant',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${email.toLowerCase()}`,
        ':tenant': `TENANT#${tenantId}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];
    const user = this.mapDynamoItemToUser(item);
    return { ...user, password: item.password } as TenantUser & { password: string };
  }

  /**
   * Get user by ID
   */
  private async getUserById(tenantId: string, userId: string): Promise<TenantUser | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `USER#${userId}`,
      },
    });

    const result = await docClient.send(command);
    if (!result.Item) {
      return null;
    }

    return this.mapDynamoItemToUser(result.Item);
  }

  /**
   * Get invitation by token
   */
  private async getInvitationByToken(tenantId: string, token: string): Promise<TenantInvitation | null> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'tokenIndex = :token AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':token': token,
        ':sk': 'INVITATION#',
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.mapDynamoItemToInvitation(result.Items[0]);
  }

  /**
   * Get pending invitation by email
   */
  private async getPendingInvitationByEmail(tenantId: string, email: string): Promise<TenantInvitation | null> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :tenant',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':email': `INVITATION_EMAIL#${email.toLowerCase()}`,
        ':tenant': `TENANT#${tenantId}`,
        ':status': 'pending',
      },
    });

    const result = await docClient.send(command);
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.mapDynamoItemToInvitation(result.Items[0]);
  }

  /**
   * Update invitation status
   */
  private async updateInvitationStatus(tenantId: string, invitationId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired'): Promise<void> {
    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `INVITATION#${invitationId}`,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date(),
      },
    });

    await docClient.send(command);
  }

  /**
   * Update last login time
   */
  private async updateLastLogin(tenantId: string, userId: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `USER#${userId}`,
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
  private generateJWT(user: TenantUser): string {
    return jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Get default permissions based on role
   */
  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case 'tenant_admin':
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
  }

  /**
   * Map DynamoDB item to User object
   */
  private mapDynamoItemToUser(item: any): TenantUser {
    const { PK, SK, GSI1PK, GSI1SK, emailIndex, password, ...user } = item;
    
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
    };
  }

  /**
   * Map DynamoDB item to Invitation object
   */
  private mapDynamoItemToInvitation(item: any): TenantInvitation {
    const { PK, SK, GSI1PK, GSI1SK, tokenIndex, ...invitation } = item;
    
    return {
      ...invitation,
      createdAt: new Date(invitation.createdAt),
      expiresAt: new Date(invitation.expiresAt),
    };
  }
}

export const authService = new AuthService();

// Export the getAuthenticatedUser function for convenience
export async function getAuthenticatedUser(request: any): Promise<TenantUser | null> {
  return authService.getAuthenticatedUser(request);
}
