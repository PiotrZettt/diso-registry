#!/bin/bash

# Helper script to find your Amplify app details
echo "🔍 Finding your Amplify app details..."

echo ""
echo "=== Available Amplify Apps ==="
aws amplify list-apps --query "apps[].{Name:name,AppId:appId,DefaultDomain:defaultDomain}" --output table

echo ""
echo "=== For manual commands, use your specific app details: ==="
echo ""

# Get first app as example
APP_ID=$(aws amplify list-apps --query "apps[0].appId" --output text)
APP_NAME=$(aws amplify list-apps --query "apps[0].name" --output text)

if [ "$APP_ID" != "None" ] && [ ! -z "$APP_ID" ]; then
    echo "Example for app '$APP_NAME' (ID: $APP_ID):"
    echo ""
    
    # Get backend environments
    echo "Backend environments:"
    aws amplify list-backend-environments --app-id $APP_ID --query "backendEnvironments[].environmentName" --output table
    
    BACKEND_ENV=$(aws amplify list-backend-environments --app-id $APP_ID --query "backendEnvironments[0].environmentName" --output text)
    STACK_NAME="amplify-$APP_NAME-$BACKEND_ENV"
    
    echo ""
    echo "CloudFormation stack: $STACK_NAME"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME >/dev/null 2>&1; then
        echo "✅ Stack exists"
        
        # Find execution roles
        echo ""
        echo "Lambda execution roles in stack:"
        aws cloudformation describe-stack-resources --stack-name $STACK_NAME --query "StackResources[?ResourceType=='AWS::IAM::Role'].{LogicalId:LogicalResourceId,PhysicalId:PhysicalResourceId}" --output table
        
    else
        echo "❌ Stack not found - check stack name format"
    fi
    
    echo ""
    echo "=== Manual commands to fix DynamoDB access ==="
    echo ""
    echo "1. Create the policy:"
    echo "   aws iam create-policy --policy-name AmplifyDynamoDBAccess-$APP_NAME --policy-document file://amplify-dynamodb-policy.json"
    echo ""
    echo "2. Find your execution role ARN from the table above, then attach policy:"
    echo "   aws iam attach-role-policy --role-name YOUR_ROLE_NAME --policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/AmplifyDynamoDBAccess-$APP_NAME"
    
else
    echo "No Amplify apps found or AWS CLI not configured properly"
fi