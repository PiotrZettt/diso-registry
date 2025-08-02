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
   * Detect if we're running in Amplify environment
   */
  private isAmplifyEnvironment(): boolean {
    return !!(
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env._AWS_XRAY_TRACE_ID ||
      process.env.AWS_LAMBDA_RUNTIME_API
    );
  }

  /**
   * Get AWS credentials from multiple sources in order:
   * 1. Amplify/Lambda - use IAM role (no explicit credentials)
   * 2. Environment variables (DEFISO_ prefixed)
   * 3. Environment variables (AWS_ prefixed) 
   * 4. SSM Parameter Store
   * 5. IAM role (default AWS SDK behavior)
   */
  async getCredentials(): Promise<AWSCredentials | null> {
    // Try to get from cache first
    if (this.credentials) {
      return this.credentials;
    }

    // 1. If in Amplify/Lambda, skip environment variables and use IAM role
    if (this.isAmplifyEnvironment()) {
      console.log('🚀 Amplify/Lambda environment detected - using IAM role credentials');
      return null; // Let AWS SDK use IAM role
    }

    // 2. Try DEFISO prefixed environment variables (local development)
    const defisoAccessKey = process.env.DEFISO_ACCESS_KEY_ID;
    const defisoSecretKey = process.env.DEFISO_SECRET_ACCESS_KEY;
    const defisoRegion = process.env.DEFISO_AWS_REGION;

    if (defisoAccessKey && defisoSecretKey) {
      console.log('✅ Using DEFISO_ prefixed environment variables');
      this.credentials = {
        accessKeyId: defisoAccessKey,
        secretAccessKey: defisoSecretKey,
        region: defisoRegion || process.env.AWS_REGION || 'eu-west-2'
      };
      return this.credentials;
    }

    // 3. Try AWS prefixed environment variables (local development)
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION;

    if (awsAccessKey && awsSecretKey) {
      console.log('✅ Using AWS_ prefixed environment variables');
      this.credentials = {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        region: awsRegion || 'eu-west-2'
      };
      return this.credentials;
    }

    // 4. Try SSM Parameter Store (fallback for environments with IAM access)
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

    // 5. Return null to use default IAM role
    console.log('⚠️ No explicit credentials found, will use IAM role');
    return null;
  }

  /**
   * Get DynamoDB client configuration
   */
  async getDynamoDBConfig(): Promise<any> {
    const region = process.env.AWS_REGION || process.env.DEFISO_AWS_REGION || 'eu-west-2';
    
    // For Amplify/Lambda environment, use IAM role (no explicit credentials)
    if (this.isAmplifyEnvironment()) {
      console.log('🚀 Amplify/Lambda environment - using IAM role for DynamoDB');
      console.log('🌍 Using region:', region);
      
      // Return minimal config to let AWS SDK use the execution role
      // Don't specify credentials at all - let AWS SDK auto-discover the Lambda execution role
      return {
        region: region,
      };
    }

    // For local development, try to get explicit credentials
    const credentials = await this.getCredentials();
    
    const config: any = {
      region: region,
    };

    if (credentials) {
      console.log('🔑 Using explicit credentials for DynamoDB');
      config.credentials = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      };
    } else {
      console.log('🔒 Using default AWS credentials chain for DynamoDB');
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
    const useDynamoDB = process.env.USE_DYNAMODB;
    console.log('🔍 USE_DYNAMODB environment variable:', useDynamoDB);
    
    // In Amplify environment, always use DynamoDB since that's our production setup
    if (this.isAmplifyEnvironment()) {
      console.log('🚀 Amplify environment detected - forcing DynamoDB usage');
      return true;
    }
    
    return useDynamoDB === 'true';
  }
}

// Export singleton instance
export const awsConfigService = new AWSConfigService();
