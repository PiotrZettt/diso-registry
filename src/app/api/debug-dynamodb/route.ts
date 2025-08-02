// Test DynamoDB connection
import { NextRequest, NextResponse } from 'next/server';
import { dynamoDBTenantService } from '@/services/dynamodb-tenant-service';
import { awsConfigService } from '@/services/aws-config-service';

export async function GET() {
  console.log('🔍 Starting DynamoDB debug...');
  
  // Check environment variables
  const envCheck = {
    AWS_REGION: process.env.AWS_REGION,
    DEFISO_AWS_REGION: process.env.DEFISO_AWS_REGION,
    DEFISO_ACCESS_KEY_ID: process.env.DEFISO_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    DEFISO_SECRET_ACCESS_KEY: process.env.DEFISO_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
    DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX,
    USE_DYNAMODB: process.env.USE_DYNAMODB,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Dump all environment variables to debug
  const allEnvVars = Object.keys(process.env)
    .filter(key => key.includes('DEFISO') || key.includes('AWS') || key.includes('DYNAMO'))
    .reduce((obj: any, key) => {
      obj[key] = key.includes('SECRET') || key.includes('KEY') ? 'REDACTED' : process.env[key];
      return obj;
    }, {});

  try {
    
    console.log('🔧 Environment variables:', envCheck);
    
    // Test the new AWS config service
    console.log('🔍 Testing AWS Config Service...');
    const credentials = await awsConfigService.getCredentials();
    const config = await awsConfigService.getDynamoDBConfig();
    
    console.log('📋 Credentials result:', credentials ? 'FOUND' : 'NOT FOUND');
    console.log('🔧 DynamoDB config:', { region: config.region, hasCredentials: !!config.credentials });
    
    // Try to list tables to test basic connection
    const { DynamoDBClient, ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
    
    const client = new DynamoDBClient(config);
    const command = new ListTablesCommand({});
    
    console.log('📡 Attempting to list tables...');
    const result = await client.send(command);
    
    const defisoTables = result.TableNames?.filter(name => name.startsWith('defiso-')) || [];
    
    console.log('✅ Successfully connected to DynamoDB');
    console.log('📊 Tables found:', result.TableNames?.length || 0);
    console.log('🎯 Defiso tables:', defisoTables);
    
    return NextResponse.json({
      success: true,
      message: 'DynamoDB connection successful',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      allEnvVars,
      region: config.region,
      hasCredentials: !!config.credentials,
      credentialsSource: credentials ? 'SSM/Env' : 'IAM Role',
      tableCount: result.TableNames?.length || 0,
      defisoTables: defisoTables,
      tablePrefix: awsConfigService.getTablePrefix()
    });
  } catch (error) {
    console.error('❌ DynamoDB connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('📋 Error details:', {
      message: errorMessage,
      stack: errorStack?.substring(0, 500), // Truncate stack trace
    });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      allEnvVars,
      hasCredentials: !!(
        (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
        (process.env.DEFISO_ACCESS_KEY_ID && process.env.DEFISO_SECRET_ACCESS_KEY)
      ),
    }, { status: 500 });
  }
}
