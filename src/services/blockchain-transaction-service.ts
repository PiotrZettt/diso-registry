// Blockchain transaction service for DynamoDB
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BlockchainTransaction, TransactionStatus, BlockchainNetwork } from '@/types/blockchain';
import { awsConfigService } from './aws-config-service';

let client: DynamoDBClient;
let docClient: DynamoDBDocumentClient;

async function initializeDynamoDBClient() {
  if (!client) {
    const config = await awsConfigService.getDynamoDBConfig();
    client = new DynamoDBClient(config);
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true, // Handle Date objects
      },
    });
  }
  return { client, docClient };
}
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'defiso';
const TRANSACTIONS_TABLE = `${TABLE_PREFIX}-blockchain-transactions`;

export class BlockchainTransactionService {
  /**
   * Record a new blockchain transaction
   */
  async recordTransaction(transaction: Omit<BlockchainTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlockchainTransaction> {
    const { docClient } = await initializeDynamoDBClient();
    const id = `${transaction.tenantId}#${Date.now()}#${Math.random().toString(36).substring(2)}`;
    
    const fullTransaction: BlockchainTransaction = {
      ...transaction,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const command = new PutCommand({
      TableName: TRANSACTIONS_TABLE,
      Item: {
        ...fullTransaction,
        PK: `TENANT#${transaction.tenantId}`,
        SK: `TXN#${id}`,
        GSI1PK: `NETWORK#${transaction.network}`,
        GSI1SK: `TXN#${id}`,
        GSI2PK: `STATUS#${transaction.status}`,
        GSI2SK: `TXN#${id}`,
        timestampIndex: fullTransaction.createdAt.toISOString(),
      },
    });

    await docClient.send(command);
    return fullTransaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(tenantId: string, transactionId: string): Promise<BlockchainTransaction | null> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new GetCommand({
      TableName: TRANSACTIONS_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `TXN#${transactionId}`,
      },
    });

    const result = await docClient.send(command);
    return result.Item ? this.mapDynamoItemToTransaction(result.Item) : null;
  }

  /**
   * Get transactions for a tenant
   */
  async getTransactionsByTenant(tenantId: string, limit = 50, lastKey?: string): Promise<{
    transactions: BlockchainTransaction[];
    lastEvaluatedKey?: string;
  }> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: TRANSACTIONS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
      },
      ScanIndexForward: false, // Newest first
      Limit: limit,
      ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined,
    });

    const result = await docClient.send(command);
    
    return {
      transactions: result.Items?.map(item => this.mapDynamoItemToTransaction(item)) || [],
      lastEvaluatedKey: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  /**
   * Get transactions by network
   */
  async getTransactionsByNetwork(network: BlockchainNetwork, limit = 50): Promise<BlockchainTransaction[]> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: TRANSACTIONS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `NETWORK#${network}`,
      },
      ScanIndexForward: false, // Newest first
      Limit: limit,
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToTransaction(item)) || [];
  }

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(status: TransactionStatus, limit = 50): Promise<BlockchainTransaction[]> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: TRANSACTIONS_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STATUS#${status}`,
      },
      ScanIndexForward: false, // Newest first
      Limit: limit,
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToTransaction(item)) || [];
  }

  /**
   * Get transactions for a certificate
   */
  async getTransactionsForCertificate(tenantId: string, certificateId: string): Promise<BlockchainTransaction[]> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: TRANSACTIONS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'certificateId = :certificateId',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':certificateId': certificateId,
      },
      ScanIndexForward: false, // Newest first
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToTransaction(item)) || [];
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    tenantId: string,
    transactionId: string,
    status: TransactionStatus,
    blockchainTxHash?: string,
    blockNumber?: number,
    errorMessage?: string
  ): Promise<BlockchainTransaction | null> {
    let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
    const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': new Date(),
    };

    if (blockchainTxHash) {
      updateExpression += ', blockchainTxHash = :txHash';
      expressionAttributeValues[':txHash'] = blockchainTxHash;
    }

    if (blockNumber) {
      updateExpression += ', blockNumber = :blockNumber';
      expressionAttributeValues[':blockNumber'] = blockNumber;
    }

    if (errorMessage) {
      updateExpression += ', errorMessage = :errorMessage';
      expressionAttributeValues[':errorMessage'] = errorMessage;
    }

    if (status === 'confirmed') {
      updateExpression += ', confirmedAt = :confirmedAt';
      expressionAttributeValues[':confirmedAt'] = new Date();
    }

    const command = new UpdateCommand({
      TableName: TRANSACTIONS_TABLE,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `TXN#${transactionId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);
    return result.Attributes ? this.mapDynamoItemToTransaction(result.Attributes) : null;
  }

  /**
   * Get pending transactions for processing
   */
  async getPendingTransactions(limit = 100): Promise<BlockchainTransaction[]> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: TRANSACTIONS_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'STATUS#pending',
      },
      Limit: limit,
    });

    const result = await docClient.send(command);
    return result.Items?.map(item => this.mapDynamoItemToTransaction(item)) || [];
  }

  /**
   * Get transaction statistics for a tenant
   */
  async getTransactionStats(tenantId: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    byNetwork: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const { docClient } = await initializeDynamoDBClient();
    const command = new QueryCommand({
      TableName: TRANSACTIONS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
      },
    });

    const result = await docClient.send(command);
    const transactions = result.Items?.map(item => this.mapDynamoItemToTransaction(item)) || [];

    const stats = {
      total: transactions.length,
      pending: 0,
      confirmed: 0,
      failed: 0,
      byNetwork: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    transactions.forEach(tx => {
      // Status counts
      if (tx.status === 'pending') stats.pending++;
      else if (tx.status === 'confirmed') stats.confirmed++;
      else if (tx.status === 'failed') stats.failed++;

      // Network counts
      const network = tx.network;
      stats.byNetwork[network] = (stats.byNetwork[network] || 0) + 1;

      // Type counts
      const type = tx.operationType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Map DynamoDB item to Transaction object
   */
  private mapDynamoItemToTransaction(item: any): BlockchainTransaction {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, timestampIndex, ...transaction } = item;
    
    return {
      ...transaction,
      createdAt: new Date(transaction.createdAt),
      updatedAt: new Date(transaction.updatedAt),
      confirmedAt: transaction.confirmedAt ? new Date(transaction.confirmedAt) : undefined,
    };
  }
}

export const blockchainTransactionService = new BlockchainTransactionService();
