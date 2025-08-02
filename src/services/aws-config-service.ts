// AWS Configuration Service - Handles credentials from various sources
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

class AWSConfigService {
  private credentials: AWSCredentials | null = null;
  private ssmClient: SSMClient | null = null;

  constructor() {
    // Initialize SSM client with default region
    this.ssmClient = new SSMClient({ 
      region: process.env.AWS_REGION || process.env.DEFISO_AWS_REGION || 'eu-west-2' 
    });
  }

  /**
   * Get AWS credentials from multiple sources in order:
   * 1. Environment variables (DEFISO_ prefixed)
   * 2. Environment variables (AWS_ prefixed) 
   * 3. SSM Parameter Store
   * 4. IAM role (default AWS SDK behavior)
   */
  async getCredentials(): Promise<AWSCredentials | null> {
    // Try to get from cache first
    if (this.credentials) {
      return this.credentials;
    }

    // Force runtime environment variable access for Amplify SSR
    const runtimeEnv = typeof window === 'undefined' ? process.env : {};
    
    // 1. Try DEFISO prefixed environment variables
    const defisoAccessKey = runtimeEnv.DEFISO_ACCESS_KEY_ID || process.env.DEFISO_ACCESS_KEY_ID;
    const defisoSecretKey = runtimeEnv.DEFISO_SECRET_ACCESS_KEY || process.env.DEFISO_SECRET_ACCESS_KEY;
    const defisoRegion = runtimeEnv.DEFISO_AWS_REGION || process.env.DEFISO_AWS_REGION;

    if (defisoAccessKey && defisoSecretKey) {
      console.log('✅ Using DEFISO_ prefixed environment variables');
      this.credentials = {
        accessKeyId: defisoAccessKey,
        secretAccessKey: defisoSecretKey,
        region: defisoRegion || process.env.AWS_REGION || 'eu-west-2'
      };
      return this.credentials;
    }

    // 2. Try AWS prefixed environment variables
    const awsAccessKey = runtimeEnv.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = runtimeEnv.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = runtimeEnv.AWS_REGION || process.env.AWS_REGION;

    if (awsAccessKey && awsSecretKey) {
      console.log('✅ Using AWS_ prefixed environment variables');
      this.credentials = {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        region: awsRegion || 'eu-west-2'
      };
      return this.credentials;
    }

    // 3. Try SSM Parameter Store
    try {
      console.log('🔍 Trying SSM Parameter Store...');
      const accessKeyParam = await this.ssmClient?.send(new GetParameterCommand({
        Name: '/defiso/aws/access-key-id',
        WithDecryption: true
      }));
      
      const secretKeyParam = await this.ssmClient?.send(new GetParameterCommand({
        Name: '/defiso/aws/secret-access-key', 
        WithDecryption: true
      }));

      if (accessKeyParam?.Parameter?.Value && secretKeyParam?.Parameter?.Value) {
        console.log('✅ Using SSM Parameter Store credentials');
        this.credentials = {
          accessKeyId: accessKeyParam.Parameter.Value,
          secretAccessKey: secretKeyParam.Parameter.Value,
          region: process.env.AWS_REGION || 'eu-west-2'
        };
        return this.credentials;
      }
    } catch (error) {
      console.log('⚠️ SSM Parameter Store not available:', error instanceof Error ? error.message : 'Unknown error');
    }

    // 4. Return null to use default IAM role
    console.log('⚠️ No explicit credentials found, will use IAM role');
    return null;
  }

  /**
   * Get DynamoDB client configuration
   */
  async getDynamoDBConfig(): Promise<any> {
    // For Amplify deployment, skip custom credentials and use IAM role
    if (process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('🚀 Amplify/Lambda detected - using IAM role');
      return {
        region: process.env.AWS_REGION || process.env.DEFISO_AWS_REGION || 'eu-west-2',
      };
    }

    const credentials = await this.getCredentials();
    
    const config: any = {
      region: process.env.AWS_REGION || process.env.DEFISO_AWS_REGION || 'eu-west-2',
    };

    if (credentials) {
      config.credentials = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      };
    }

    return config;
  }

  /**
   * Get table prefix for DynamoDB
   */
  getTablePrefix(): string {
    return process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
  }

  /**
   * Check if DynamoDB should be used
   */
  shouldUseDynamoDB(): boolean {
    return process.env.USE_DYNAMODB === 'true';
  }
}

// Export singleton instance
export const awsConfigService = new AWSConfigService();
