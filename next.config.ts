import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // AWS Configuration
    AWS_REGION: process.env.AWS_REGION,
    DEFISO_AWS_REGION: process.env.DEFISO_AWS_REGION,
    DEFISO_ACCESS_KEY_ID: process.env.DEFISO_ACCESS_KEY_ID,
    DEFISO_SECRET_ACCESS_KEY: process.env.DEFISO_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    
    // DynamoDB Configuration
    DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX,
    USE_DYNAMODB: process.env.USE_DYNAMODB,
    
    // Authentication
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    
    // Blockchain Configuration
    ETHERLINK_RPC_URL: process.env.ETHERLINK_RPC_URL,
    ETHERLINK_PRIVATE_KEY: process.env.ETHERLINK_PRIVATE_KEY,
    ETHERLINK_CONTRACT_ADDRESS: process.env.ETHERLINK_CONTRACT_ADDRESS,
    
    // IPFS/Pinata Configuration
    IPFS_GATEWAY: process.env.IPFS_GATEWAY,
    PINATA_API_KEY: process.env.PINATA_API_KEY,
    PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY,
  },
};

export default nextConfig;
