# API Migration Guide

This directory contains the old API routes that directly connect to DynamoDB. These routes are deprecated and should be replaced with the new API Gateway + Lambda architecture.

## Old Routes (Deprecated)

The following routes in this directory are deprecated:

### Authentication Routes
- `/api/auth/register` → Use Lambda auth function via API Gateway
- `/api/auth/login` → Use Lambda auth function via API Gateway  
- `/api/auth/logout` → Use Lambda auth function via API Gateway
- `/api/auth/me` → Use Lambda auth function via API Gateway

### Certificate Routes
- `/api/certificates/*` → Use Lambda certificates function via API Gateway

## New Architecture

The new architecture uses:

1. **API Gateway** - Routes requests to Lambda functions
2. **Lambda Functions** - Handle business logic and DynamoDB operations
3. **Frontend API Client** - Communicates with API Gateway instead of Next.js API routes

## Migration Steps

1. Deploy Lambda functions and API Gateway using `npm run deploy:api`
2. Update environment variables with API Gateway URL
3. Test the new endpoints
4. Remove or rename the old API routes to prevent conflicts

## Directory Structure

```
src/
├── services/
│   ├── api-client.ts          # New API client for Lambda/API Gateway
│   ├── auth-service-api.ts    # New auth service using API client
│   └── certificate-service-api.ts # New certificate service using API client
└── app/api/                   # Old Next.js API routes (deprecated)
    ├── auth-api/              # New simplified routes (optional)
    └── certificates-api/      # New simplified routes (optional)
```

## Benefits of New Architecture

1. **Environment Variable Issues Solved** - Lambda functions use hardcoded credentials
2. **Better Scalability** - API Gateway and Lambda scale automatically
3. **Cost Efficiency** - Pay per request instead of running server continuously
4. **User Isolation** - Each user can only access their own data
5. **No Multitenancy** - Simplified data model as requested