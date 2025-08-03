# AWS Deployment Guide for Parenting App

This guide will walk you through deploying your parenting app to AWS using the recommended architecture.

## Architecture Overview

- **Frontend**: React app deployed on AWS Amplify
- **Backend**: FastAPI deployed on AWS Lambda + API Gateway
- **Database**: PostgreSQL on Amazon RDS
- **AI Components**: CrewAI agents running on Lambda
- **Storage**: AWS S3 (if needed for file uploads)

## Prerequisites

### 1. AWS Account Setup
1. Sign up for AWS at [aws.amazon.com](https://aws.amazon.com/)
2. You'll need a credit card, but AWS offers a free tier for 12 months
3. Create an IAM user with appropriate permissions (or use root for testing)

### 2. Install Required Tools
```bash
# Install AWS CLI
pip install awscli

# Install AWS SAM CLI
pip install aws-sam-cli

# Install Docker (for Lambda builds)
# Download from https://www.docker.com/products/docker-desktop
```

### 3. Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your output format (json)
```

### 4. GitHub Repository
1. Create a GitHub account if you don't have one
2. Create a new repository for your project
3. Push your current code to GitHub

## Step-by-Step Deployment

### Phase 1: Database Setup (Amazon RDS)

#### 1. Create RDS Instance
1. Go to AWS RDS Console
2. Click "Create database"
3. Choose "Standard create"
4. Select "PostgreSQL"
5. Choose "Free tier" (for testing)
6. Configure:
   - DB instance identifier: `parenting-app-db`
   - Master username: `admin`
   - Master password: `your-secure-password`
   - Public access: Yes (for testing)
   - VPC security group: Create new
7. Click "Create database"

#### 2. Configure Database
1. Wait for the database to be available
2. Note the endpoint URL
3. Connect to the database using pgAdmin or DBeaver
4. Run the `database-setup.sql` script

### Phase 2: Backend Deployment (Lambda + API Gateway)

#### 1. Prepare Environment Variables
1. Copy `backend/env-aws-template.txt` to `backend/.env`
2. Update the values:
   ```bash
   DATABASE_URL=postgresql://admin:your-password@your-rds-endpoint:5432/parenting_app
   SECRET_KEY=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key
   FIREBASE_CLIENT_ID=your-firebase-client-id
   FIREBASE_PROJECT_ID=your-firebase-project-id
   ```

#### 2. Deploy Backend
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
- Build the Lambda package
- Deploy using SAM
- Output the API Gateway URL

### Phase 3: Frontend Deployment (AWS Amplify)

#### 1. Connect GitHub Repository
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Choose GitHub as your repository provider
4. Connect your GitHub account
5. Select your repository and branch

#### 2. Configure Build Settings
1. Build image: Ubuntu 18.01
2. Build commands:
   ```bash
   npm ci
   npm run build
   ```
3. Output directory: `build`

#### 3. Add Environment Variables
Add these environment variables in Amplify:
- `REACT_APP_API_URL`: Your API Gateway URL from backend deployment
- `REACT_APP_FIREBASE_API_KEY`: Your Firebase API key
- `REACT_APP_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `REACT_APP_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `REACT_APP_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase sender ID
- `REACT_APP_FIREBASE_APP_ID`: Your Firebase app ID

#### 4. Deploy
1. Click "Save and deploy"
2. Wait for the build to complete
3. Your app will be available at the provided URL

## Testing the Deployment

### 1. Test Backend API
```bash
# Test the health endpoint
curl https://your-api-gateway-url/prod/test

# Expected response: {"message": "Backend is working!"}
```

### 2. Test Frontend
1. Open your Amplify app URL
2. Test the login functionality
3. Test the chat functionality
4. Verify database connections

### 3. Test Database
1. Connect to your RDS instance
2. Verify tables are created
3. Test inserting/querying data

## Monitoring and Maintenance

### 1. CloudWatch Logs
- Lambda function logs are automatically sent to CloudWatch
- Monitor for errors and performance issues
- Set up alarms for critical errors

### 2. Cost Monitoring
- Set up AWS Budgets to monitor costs
- Free tier limits:
  - Lambda: 1M requests/month
  - API Gateway: 1M requests/month
  - RDS: 750 hours/month
  - Amplify: 1000 build minutes/month

### 3. Security
- Regularly rotate API keys
- Monitor IAM permissions
- Enable CloudTrail for audit logs

## Troubleshooting

### Common Issues

#### 1. Lambda Cold Start
- Consider using provisioned concurrency for better performance
- Optimize package size by removing unnecessary dependencies

#### 2. Database Connection Issues
- Check security group settings
- Verify connection string format
- Ensure database is publicly accessible (for testing)

#### 3. CORS Issues
- Verify CORS settings in API Gateway
- Check frontend API URL configuration

#### 4. Environment Variables
- Ensure all required environment variables are set
- Check variable names match exactly

### Debug Commands
```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/parenting-app"

# Test API Gateway
aws apigateway get-rest-apis

# Check RDS status
aws rds describe-db-instances --db-instance-identifier parenting-app-db
```

## Next Steps (Phase 2)

After successful Phase 1 deployment:

1. **Optimize Performance**
   - Add caching with ElastiCache
   - Implement CDN for static assets
   - Optimize Lambda cold starts

2. **Add Advanced Features**
   - File uploads to S3
   - Email notifications with SES
   - Advanced monitoring with X-Ray

3. **Security Enhancements**
   - Implement proper CORS policies
   - Add rate limiting
   - Set up WAF for API protection

## Cost Estimation

### Free Tier (12 months)
- Lambda: Free (1M requests/month)
- API Gateway: Free (1M requests/month)
- RDS: Free (750 hours/month)
- Amplify: Free (1000 build minutes/month)

### After Free Tier
- Lambda: ~$0.20 per 1M requests
- API Gateway: ~$3.50 per 1M requests
- RDS: ~$15/month for t3.micro
- Amplify: ~$0.01 per build minute

Total estimated cost: ~$20-30/month for moderate usage.

## Support

If you encounter issues:
1. Check AWS CloudWatch logs
2. Review this deployment guide
3. Consult AWS documentation
4. Consider AWS support plans for production use 