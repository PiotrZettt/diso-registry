# Fix Amplify DynamoDB Access

The issue is that your Amplify deployment doesn't have the necessary IAM permissions to access DynamoDB tables.

## Steps to fix:

### Option 1: Using AWS Console (Recommended)

1. **Find your Amplify execution role:**
   - Go to AWS Console → Amplify → Your App → Backend environments
   - Look for the execution role name (usually contains "amplify" and your app name)

2. **Attach DynamoDB permissions:**
   - Go to AWS Console → IAM → Roles
   - Find your Amplify execution role
   - Click "Attach policies" → "Create policy"
   - Use the JSON from `amplify-dynamodb-policy.json`
   - Name it something like "AmplifyDynamoDBAccess"
   - Attach it to your role

### Option 2: Using Amplify CLI

1. **Add custom IAM policy:**
   ```bash
   amplify add function
   # Choose your existing function or create a new one
   amplify update function
   # Add the DynamoDB permissions in the function configuration
   ```

2. **Or modify amplify/backend/function/[function-name]/[function-name]-cloudformation-template.json:**
   Add the DynamoDB permissions to the execution role.

### Option 3: Using Environment-specific approach

Add this to your `amplify/backend/backend-config.json`:

```json
{
  "function": {
    "yourFunctionName": {
      "dependsOn": [],
      "providerPlugin": "awscloudformation",
      "service": "Lambda",
      "build": true,
      "environmentMap": {
        "REGION": {
          "Ref": "AWS::Region"
        }
      }
    }
  }
}
```

## Verify the fix:

After applying the policy, test your deployment by calling the debug endpoint:
```
https://your-amplify-app.com/api/debug/aws-config
```

This should show:
- `environment.isAmplify: true`
- `dynamoConnection.success: true`
- A list of your DynamoDB tables

## Tables that need access:

- `defiso-certificates` (main certificates table)
- `defiso-users` (user authentication)
- `defiso-blockchain-transactions` (blockchain audit trail)  
- `defiso-tenants` (multi-tenancy support)
- `defiso-audit-logs` (audit logging)

## Common errors without this fix:

- `AccessDeniedException: User is not authorized to perform: dynamodb:GetItem`
- `ResourceNotFoundException: Requested resource not found`
- `UnauthorizedOperation: You are not authorized to perform this operation`