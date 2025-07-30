# AWS PostgreSQL Setup Guide

## Prerequisites
- AWS CLI installed and configured
- AWS account with appropriate permissions
- PostgreSQL client (psql) installed

## Step 1: Create PostgreSQL on AWS RDS

### Option A: Using AWS CLI (Recommended)
```bash
# Make the script executable
chmod +x aws-setup.sh

# Run the setup script
./aws-setup.sh
```

### Option B: Using AWS Console
1. Go to AWS RDS Console
2. Click "Create database"
3. Choose "PostgreSQL"
4. Select "Free tier" or appropriate instance class
5. Set database identifier: `defiso-postgres`
6. Master username: `defiso_admin`
7. Set a strong password
8. Choose VPC and security group
9. Enable encryption
10. Set backup retention to 7 days

## Step 2: Configure Security Group
Ensure the security group allows inbound connections on port 5432 from your application servers.

## Step 3: Get Connection Details
```bash
# Get the endpoint URL
aws rds describe-db-instances \
  --db-instance-identifier defiso-postgres \
  --region eu-west-2 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

## Step 4: Test Connection
```bash
# Test connection with psql
psql -h defiso-postgres.xxxxxxxxx.eu-west-2.rds.amazonaws.com -U defiso_admin -d postgres
```

## Step 5: Configure Environment
1. Copy `.env.example` to `.env.local`
2. Update `DATABASE_URL` with your RDS endpoint
3. Update other configuration values

## Step 6: Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

## Step 7: Verify Setup
```bash
# Check database connection
npx prisma studio

# Run the application
npm run dev
```

## Production Considerations

### Security
- Use IAM database authentication
- Enable SSL/TLS connections
- Rotate passwords regularly
- Use VPC endpoints for private connections

### Performance
- Choose appropriate instance class
- Configure read replicas for read-heavy workloads
- Set up connection pooling
- Monitor database performance

### Backup & Recovery
- Enable automated backups
- Test restore procedures
- Consider cross-region backups
- Set up monitoring and alerting

## Cost Optimization
- Use reserved instances for production
- Monitor and optimize storage
- Set up CloudWatch alarms
- Consider Aurora Serverless for variable workloads

## Troubleshooting

### Connection Issues
- Check security group rules
- Verify VPC configuration
- Ensure RDS instance is in "available" state
- Check network ACLs

### Performance Issues
- Monitor CloudWatch metrics
- Check connection pooling
- Optimize queries
- Consider read replicas

### Common Errors
- "Connection refused" - Check security group
- "Authentication failed" - Verify credentials
- "Database not found" - Check database name
- "SSL required" - Enable SSL in connection string
