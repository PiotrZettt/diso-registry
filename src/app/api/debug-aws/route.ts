import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export async function GET(request: NextRequest) {
  try {
    console.log('=== AWS Debug Info ===');
    console.log('Process env AWS_REGION:', process.env.AWS_REGION);
    console.log('Process env AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('Process env AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
    console.log('Process env AWS_SESSION_TOKEN exists:', !!process.env.AWS_SESSION_TOKEN);
    console.log('Process env USE_DYNAMODB:', process.env.USE_DYNAMODB);
    console.log('Process env DYNAMODB_TABLE_PREFIX:', process.env.DYNAMODB_TABLE_PREFIX);

    // Test DynamoDB client creation
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2',
    });

    console.log('DynamoDB client created successfully');

    // Try to list tables
    const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
    const command = new ListTablesCommand({});
    
    console.log('Attempting to list DynamoDB tables...');
    const result = await client.send(command);
    console.log('DynamoDB tables found:', result.TableNames?.length || 0);

    return NextResponse.json({
      success: true,
      message: 'AWS connection successful',
      data: {
        region: process.env.AWS_REGION,
        tablesFound: result.TableNames?.length || 0,
        tableNames: result.TableNames?.filter(name => name.includes('defiso')) || [],
        hasAWSCredentials: {
          accessKey: !!process.env.AWS_ACCESS_KEY_ID,
          secretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: !!process.env.AWS_SESSION_TOKEN,
        }
      }
    });

  } catch (error) {
    console.error('AWS Debug failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorCode: (error as any)?.code,
      errorName: (error as any)?.name,
      config: {
        region: process.env.AWS_REGION,
        useDynamoDB: process.env.USE_DYNAMODB,
        tablePrefix: process.env.DYNAMODB_TABLE_PREFIX
      }
    }, { status: 500 });
  }
}