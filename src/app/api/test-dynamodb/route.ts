import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Test DynamoDB connection
export async function GET(request: NextRequest) {
  try {
    console.log('Testing DynamoDB connection...');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('USE_DYNAMODB:', process.env.USE_DYNAMODB);
    console.log('DYNAMODB_TABLE_PREFIX:', process.env.DYNAMODB_TABLE_PREFIX);

    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2',
    });

    const docClient = DynamoDBDocumentClient.from(client);
    
    // Try to put a test item
    const testTableName = `${process.env.DYNAMODB_TABLE_PREFIX || 'defiso'}-test`;
    
    const putCommand = new PutCommand({
      TableName: testTableName,
      Item: {
        id: 'test-connection',
        timestamp: new Date().toISOString(),
        message: 'DynamoDB connection test'
      }
    });

    console.log('Attempting to write to table:', testTableName);
    await docClient.send(putCommand);
    console.log('Successfully wrote test item to DynamoDB');

    // Try to read it back
    const getCommand = new GetCommand({
      TableName: testTableName,
      Key: {
        id: 'test-connection'
      }
    });

    const result = await docClient.send(getCommand);
    console.log('Successfully read test item from DynamoDB:', result.Item);

    return NextResponse.json({
      success: true,
      message: 'DynamoDB connection successful',
      data: result.Item,
      config: {
        region: process.env.AWS_REGION,
        tablePrefix: process.env.DYNAMODB_TABLE_PREFIX,
        useDynamoDB: process.env.USE_DYNAMODB
      }
    });

  } catch (error) {
    console.error('DynamoDB connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        region: process.env.AWS_REGION,
        tablePrefix: process.env.DYNAMODB_TABLE_PREFIX,
        useDynamoDB: process.env.USE_DYNAMODB
      }
    }, { status: 500 });
  }
}