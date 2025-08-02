# API Gateway + Lambda Deployment Guide

This guide explains how to deploy the refactored DeFi ISO Registry using API Gateway and Lambda functions instead of direct DynamoDB connections.

## Architecture Overview

The new architecture consists of:

1. **Frontend**: Next.js application
2. **API Gateway**: Routes requests to Lambda functions
3. **Lambda Functions**: Handle authentication and certificate operations
4. **DynamoDB**: Data storage (accessed only by Lambda functions)

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Node.js 18+** installed
3. **Serverless Framework** installed globally: `npm install -g serverless`
4. **AWS credentials** configured for deployment (AWS CLI or environment variables)
   - Required permissions: Lambda, DynamoDB, IAM, API Gateway, CloudFormation

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your configuration:

```bash
cp .env.lambda .env.local
```

Edit `.env.local` with your configuration:

```env
# JWT Configuration (required)
JWT_SECRET=your-strong-jwt-secret-key-change-in-production

# AWS Configuration
AWS_REGION=eu-west-2

# DynamoDB Configuration  
DYNAMODB_TABLE_PREFIX=defiso
```

**Important**: Lambda functions use IAM roles for AWS access - no credentials needed in environment variables!

### 2.1. Optional: Blockchain Configuration

To enable blockchain verification and IPFS storage, add these optional environment variables:

```env
# Blockchain Configuration (optional)
ETHERLINK_RPC_URL=https://node.ghostnet.etherlink.com
ETHERLINK_PRIVATE_KEY=your-etherlink-private-key
ETHERLINK_CONTRACT_ADDRESS=your-deployed-contract-address

# IPFS Configuration (optional)
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret-key
```

**Note**: Without blockchain configuration, certificates will still be created and stored in DynamoDB, but won't be deployed to blockchain or IPFS.

### 3. Install Lambda Dependencies

Install dependencies for each Lambda function:

```bash
# Install auth Lambda dependencies
cd lambda/auth
npm install
cd ../..

# Install certificates Lambda dependencies
cd lambda/certificates
npm install
cd ../..
```

### 4. Deploy API Gateway and Lambda Functions

Deploy using Serverless Framework:

```bash
# Deploy to dev environment
npm run deploy:api

# Or deploy to specific stage
serverless deploy --stage prod
```

This will create:
- DynamoDB tables: `defiso-dev-users` and `defiso-dev-certificates`
- Lambda functions: `defiso-api-dev-auth` and `defiso-api-dev-certificates`
- API Gateway with CORS-enabled endpoints

### 5. Update Frontend Configuration

After deployment, update your frontend environment variables with the API Gateway URL:

```env
NEXT_PUBLIC_API_URL=https://your-api-gateway-id.execute-api.eu-west-2.amazonaws.com/dev
```

### 6. Deploy Frontend

Deploy your Next.js application to your preferred hosting platform (Vercel, Netlify, AWS Amplify, etc.).

## API Endpoints

The deployed API Gateway will provide these endpoints:

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout user

### Certificates (Private - Requires Authentication)
- `POST /certificates` - Create certificate (with blockchain deployment)
- `GET /certificates` - Get user certificates
- `GET /certificates/{id}` - Get specific certificate
- `PUT /certificates/{id}` - Update certificate
- `DELETE /certificates/{id}` - Delete certificate

### Public Certificate Verification (No Authentication Required)
- `GET /public/certificates` - Get all public certificates (paginated)
- `GET /public/certificates/search?organization=...&standard=...` - Search certificates
- `GET /public/certificates/verify/{certificateNumber}` - Verify certificate on blockchain

## Local Development

For local development, you can run the API locally using serverless-offline:

```bash
# Start local API server
npm run dev:api

# In another terminal, start Next.js frontend
npm run dev
```

Make sure to set the local API URL in your environment:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Database Schema

The Lambda functions will create these DynamoDB tables:

### Users Table (`defiso-dev-users`)
- **PK**: `USER#{userId}` 
- **SK**: `USER#{userId}`
- **GSI1PK**: `EMAIL#{email}`
- **GSI1SK**: `USER#{userId}`

### Certificates Table (`defiso-dev-certificates`)
- **PK**: `USER#{userId}`
- **SK**: `CERT#{certificateNumber}`
- **GSI1PK**: `ORG#{organizationName}`
- **GSI1SK**: `CERT#{certificateNumber}`
- **GSI2PK**: `STANDARD#{standardNumber}`
- **GSI2SK**: `CERT#{certificateNumber}`

## Security Considerations

1. **IAM Roles**: Lambda functions use IAM roles for AWS access - no credentials in code or environment
2. **JWT Tokens**: Used for authentication between frontend and Lambda functions
3. **CORS**: Configured to allow frontend domain access
4. **User Isolation**: Each user can only access their own certificates
5. **Least Privilege**: IAM roles only grant necessary DynamoDB permissions

## Monitoring and Troubleshooting

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/defiso-api-dev-auth` and `/aws/lambda/defiso-api-dev-certificates`
- API Gateway logs can be enabled in the AWS console

### Common Issues

1. **CORS Errors**: Make sure your frontend domain is allowed in the serverless.yml CORS configuration
2. **Authentication Errors**: Check JWT secret consistency between Lambda functions
3. **DynamoDB Errors**: Verify AWS credentials have proper DynamoDB permissions

### Cleanup

To remove all deployed resources:

```bash
npm run remove:api
```

This will delete all Lambda functions, API Gateway, and DynamoDB tables.

## Migration from Old Architecture

1. **Data Migration**: If you have existing data in DynamoDB, you may need to migrate it to the new table structure
2. **Frontend Updates**: Update all API calls to use the new API Gateway endpoints
3. **Authentication**: Users will need to log in again as the authentication system has changed

## Cost Optimization

- DynamoDB tables use **PAY_PER_REQUEST** billing mode
- Lambda functions are billed per execution
- API Gateway is billed per request
- Consider using Lambda provisioned concurrency for consistent performance if needed