// Debug endpoint to test AWS configuration and DynamoDB connection
import { NextRequest, NextResponse } from 'next/server';
import { awsConfigService } from '@/services/aws-config-service';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Testing AWS configuration...');
    
    // Test environment detection
    const isAmplify = !!(
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env._AWS_XRAY_TRACE_ID ||
      process.env.AWS_LAMBDA_RUNTIME_API
    );

    // Get DynamoDB config
    const dynamoConfig = await awsConfigService.getDynamoDBConfig();
    
    // Test DynamoDB connection
    const dynamoClient = new DynamoDBClient(dynamoConfig);
    
    let tablesResult = null;
    let tablesError = null;
    
    try {
      console.log('🔍 Testing DynamoDB connection...');
      const listTablesResult = await dynamoClient.send(new ListTablesCommand({}));
      tablesResult = {
        tableCount: listTablesResult.TableNames?.length || 0,
        tables: listTablesResult.TableNames?.slice(0, 5) || [], // Show first 5 tables
      };
      console.log('✅ DynamoDB connection successful');
    } catch (error) {
      tablesError = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ DynamoDB connection failed:', tablesError);
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isAmplify,
        hasAWSExecutionEnv: !!process.env.AWS_EXECUTION_ENV,
        hasLambdaFunction: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
        hasXrayTrace: !!process.env._AWS_XRAY_TRACE_ID,
        hasLambdaRuntimeApi: !!process.env.AWS_LAMBDA_RUNTIME_API,
        awsRegion: process.env.AWS_REGION,
      },
      credentials: {
        hasDefisoAccessKey: !!process.env.DEFISO_ACCESS_KEY_ID,
        hasDefisoSecretKey: !!process.env.DEFISO_SECRET_ACCESS_KEY,
        hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        defisoRegion: process.env.DEFISO_AWS_REGION,
      },
      dynamoConfig: {
        region: dynamoConfig.region,
        hasExplicitCredentials: !!dynamoConfig.credentials,
      },
      dynamoConnection: {
        success: !!tablesResult,
        error: tablesError,
        ...tablesResult,
      },
      tablePrefix: awsConfigService.getTablePrefix(),
      shouldUseDynamoDB: awsConfigService.shouldUseDynamoDB(),
    };

    return NextResponse.json({
      success: true,
      message: 'AWS configuration debug completed',
      data: debugInfo,
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}