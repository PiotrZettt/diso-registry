#!/bin/bash

# Fix Amplify DynamoDB permissions using AWS CLI
# Run this script to grant your Amplify app access to DynamoDB tables

set -e

echo "🔍 Finding Amplify app and execution role..."

# Get your Amplify app ID (you may need to replace this with your actual app name)
APP_NAME="diso-registry"
APP_ID=$(aws amplify list-apps --query "apps[?name=='$APP_NAME'].appId" --output text)

if [ -z "$APP_ID" ]; then
    echo "❌ Could not find Amplify app named '$APP_NAME'"
    echo "Available apps:"
    aws amplify list-apps --query "apps[].{Name:name,AppId:appId}" --output table
    echo ""
    echo "Please update APP_NAME in this script with your actual app name"
    exit 1
fi

echo "✅ Found Amplify app: $APP_NAME (ID: $APP_ID)"

# Get the backend environment (usually 'main' or 'dev')
BACKEND_ENV=$(aws amplify list-backend-environments --app-id $APP_ID --query "backendEnvironments[0].environmentName" --output text)
echo "✅ Backend environment: $BACKEND_ENV"

# Find CloudFormation stack for this app
STACK_NAME="amplify-$APP_NAME-$BACKEND_ENV"
echo "🔍 Looking for CloudFormation stack: $STACK_NAME"

# Get the Lambda execution role from CloudFormation stack
EXECUTION_ROLE_ARN=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --query "StackResources[?ResourceType=='AWS::IAM::Role' && contains(LogicalResourceId, 'LambdaExecutionRole')].PhysicalResourceId" --output text)

if [ -z "$EXECUTION_ROLE_ARN" ]; then
    echo "❌ Could not find Lambda execution role in stack"
    echo "Available roles in stack:"
    aws cloudformation describe-stack-resources --stack-name $STACK_NAME --query "StackResources[?ResourceType=='AWS::IAM::Role'].{LogicalId:LogicalResourceId,PhysicalId:PhysicalResourceId}" --output table
    exit 1
fi

echo "✅ Found execution role: $EXECUTION_ROLE_ARN"

# Create the DynamoDB policy
POLICY_NAME="AmplifyDynamoDBAccess-$APP_NAME"
POLICY_DOC='amplify-dynamodb-policy.json'

echo "📝 Creating IAM policy: $POLICY_NAME"

# Check if policy already exists
POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)

if [ -z "$POLICY_ARN" ]; then
    # Create new policy
    POLICY_ARN=$(aws iam create-policy --policy-name $POLICY_NAME --policy-document file://$POLICY_DOC --query "Policy.Arn" --output text)
    echo "✅ Created new policy: $POLICY_ARN"
else
    echo "✅ Policy already exists: $POLICY_ARN"
    # Update existing policy
    aws iam create-policy-version --policy-arn $POLICY_ARN --policy-document file://$POLICY_DOC --set-as-default
    echo "✅ Updated policy to latest version"
fi

# Attach policy to role
echo "🔗 Attaching policy to execution role..."
aws iam attach-role-policy --role-name $EXECUTION_ROLE_ARN --policy-arn $POLICY_ARN

echo "✅ Policy attached successfully!"

# Verify the attachment
echo "🔍 Verifying policy attachment..."
ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name $EXECUTION_ROLE_ARN --query "AttachedPolicies[?PolicyName=='$POLICY_NAME'].PolicyName" --output text)

if [ "$ATTACHED_POLICIES" == "$POLICY_NAME" ]; then
    echo "✅ Policy successfully attached to role"
else
    echo "❌ Policy attachment verification failed"
    exit 1
fi

echo ""
echo "🎉 SUCCESS! Your Amplify app now has DynamoDB permissions."
echo ""
echo "Next steps:"
echo "1. Redeploy your Amplify app (or wait for auto-deploy)"
echo "2. Test the connection: https://your-app.amplifyapp.com/api/debug/aws-config"
echo ""
echo "Tables accessible:"
echo "- defiso-certificates"
echo "- defiso-users"
echo "- defiso-blockchain-transactions"
echo "- defiso-tenants"
echo "- defiso-audit-logs"