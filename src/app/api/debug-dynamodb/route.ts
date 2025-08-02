// Test DynamoDB connection
import { NextRequest, NextResponse } from 'next/server';
import { dynamoDBTenantService } from '@/services/dynamodb-tenant-service';

export async function GET() {
  try {
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
    
    console.log('🔧 Environment variables:', envCheck);
    
    // Try to list tables to test basic connection
    const { DynamoDBClient, ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
    
    const clientConfig: any = {
      region: process.env.AWS_REGION || process.env.DEFISO_AWS_REGION || 'eu-west-2',
    };

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.DEFISO_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.DEFISO_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
      console.log('✅ Using explicit credentials');
    } else {
      console.log('⚠️ No explicit credentials found, relying on IAM role');
    }

    console.log('🌍 Client config region:', clientConfig.region);

    const client = new DynamoDBClient(clientConfig);
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
      region: clientConfig.region,
      hasCredentials: !!(accessKeyId && secretAccessKey),
      tableCount: result.TableNames?.length || 0,
      defisoTables: defisoTables,
      tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'defiso'
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
      environment: {
        AWS_REGION: process.env.AWS_REGION,
        DEFISO_AWS_REGION: process.env.DEFISO_AWS_REGION,
        DEFISO_ACCESS_KEY_ID: process.env.DEFISO_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
        DEFISO_SECRET_ACCESS_KEY: process.env.DEFISO_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
        DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX,
        USE_DYNAMODB: process.env.USE_DYNAMODB,
        NODE_ENV: process.env.NODE_ENV,
      },
      hasCredentials: !!(
        (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
        (process.env.DEFISO_ACCESS_KEY_ID && process.env.DEFISO_SECRET_ACCESS_KEY)
      ),
    }, { status: 500 });
  }
}
