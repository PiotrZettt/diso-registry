// Debug endpoint to check blockchain environment variables
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking blockchain environment variables...');
    
    const envVars = {
      ETHERLINK_RPC_URL: process.env.ETHERLINK_RPC_URL || 'NOT_SET',
      ETHERLINK_PRIVATE_KEY: process.env.ETHERLINK_PRIVATE_KEY ? 'SET' : 'NOT_SET',
      ETHERLINK_CONTRACT_ADDRESS: process.env.ETHERLINK_CONTRACT_ADDRESS || 'NOT_SET',
      IPFS_GATEWAY: process.env.IPFS_GATEWAY || 'NOT_SET',
      PINATA_API_KEY: process.env.PINATA_API_KEY ? 'SET' : 'NOT_SET',
      PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY ? 'SET' : 'NOT_SET',
    };

    console.log('🔍 Environment variables status:', envVars);

    // Test blockchain service creation
    let blockchainServiceStatus = 'UNKNOWN';
    try {
      const { blockchainService } = await import('@/services/blockchain-service');
      blockchainServiceStatus = 'CREATED';
      
      // Test wallet balance to see if contract is initialized
      const walletInfo = await blockchainService.getWalletBalance();
      console.log('🔍 Wallet info:', walletInfo);
      
      return NextResponse.json({
        success: true,
        data: {
          environmentVariables: envVars,
          blockchainServiceStatus,
          walletInfo,
          message: 'Blockchain debug check completed'
        }
      });
    } catch (serviceError) {
      console.error('❌ Blockchain service error:', serviceError);
      blockchainServiceStatus = `ERROR: ${serviceError instanceof Error ? serviceError.message : 'Unknown error'}`;
      
      return NextResponse.json({
        success: false,
        data: {
          environmentVariables: envVars,
          blockchainServiceStatus,
          error: serviceError instanceof Error ? serviceError.message : 'Unknown service error'
        }
      });
    }

  } catch (error) {
    console.error('❌ Debug blockchain error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}