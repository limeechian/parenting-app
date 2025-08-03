# 🚀 AWS SAM Deployment Guide for Parenting App Backend

This guide will help you deploy your full FastAPI backend using AWS SAM (Serverless Application Model).

## 📋 Prerequisites

- ✅ AWS CLI configured
- ✅ AWS SAM CLI installed
- ✅ RDS PostgreSQL database created
- ✅ Environment variables ready

## 🔧 Step 1: Verify SAM CLI Installation

Run this command to verify SAM CLI is installed:
```bash
sam --version
```

If not installed, install it:
```bash
pip install --user aws-sam-cli
```

## 🏗️ Step 2: Prepare Your Backend

Your backend is already prepared with:
- ✅ `template.yaml` - SAM template
- ✅ `lambda_function.py` - Lambda handler with Mangum
- ✅ `requirements-lambda.txt` - Dependencies
- ✅ `main.py` - Full FastAPI application
- ✅ `crewai_agents.py` - AI agents

## 🚀 Step 3: Deploy Using SAM

### Option A: Using the Deployment Script
```bash
cd backend
deploy-sam.bat
```

### Option B: Manual Deployment
```bash
cd backend

# Build the SAM application
sam build

# Deploy (guided mode for first time)
sam deploy --guided
```

## 📝 Step 4: SAM Deployment Configuration

When running `sam deploy --guided`, you'll be prompted for:

### **Stack Name**
```
Stack Name [sam-app]: parenting-app-backend
```

### **AWS Region**
```
AWS Region [us-east-1]: ap-southeast-2
```

### **Parameter Values**
```
Parameter DatabaseURL [None]: postgresql+asyncpg://parenting_admin:your-password@your-rds-endpoint:5432/parenting_app
Parameter SecretKey [None]: your-secret-key
Parameter OpenAIAPIKey [None]: sk-proj-your-openai-key
Parameter FirebaseClientID [None]: your-firebase-client-id
Parameter FirebaseProjectID [None]: your-firebase-project-id
```

### **Confirm Changes**
```
Confirm changes before deploy [Y/n]: Y
```

### **Allow SAM CLI IAM Role Creation**
```
Allow SAM CLI IAM role creation [Y/n]: Y
```

### **Save Arguments**
```
Save arguments to configuration file [Y/n]: Y
```

## 🗄️ Step 5: Set Up Database

After deployment, set up your database tables:

### **Option A: Using pgAdmin**
1. Connect to your RDS database
2. Open Query Tool
3. Run the `database-setup.sql` script

### **Option B: Using DBeaver**
1. Connect to your RDS database
2. Open SQL Editor
3. Run the `database-setup.sql` script

### **Option C: Using AWS CLI**
```bash
# Connect to RDS and run the script
psql -h your-rds-endpoint -U parenting_admin -d parenting_app -f database-setup.sql
```

## 🔗 Step 6: Update Frontend API URL

After deployment, SAM will provide an API Gateway endpoint. Update your frontend:

```typescript
// frontend/src/services/api.ts
const API_BASE_URL = 'https://your-sam-api-id.execute-api.ap-southeast-2.amazonaws.com/prod';
```

## 🧪 Step 7: Test Your Deployment

### **Test API Endpoints**
```bash
# Test the health endpoint
curl https://your-sam-api-id.execute-api.ap-southeast-2.amazonaws.com/prod/test

# Test authentication
curl -X POST https://your-sam-api-id.execute-api.ap-southeast-2.amazonaws.com/prod/auth/jwt/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&password=test"
```

### **Test Frontend Integration**
1. Update your frontend API URL
2. Push changes to GitHub
3. Amplify will automatically redeploy
4. Test login and AI chat features

## 📊 Step 8: Monitor Your Application

### **CloudWatch Logs**
- Go to AWS CloudWatch
- Find your Lambda function logs
- Monitor for errors and performance

### **API Gateway Metrics**
- Go to API Gateway console
- Monitor request counts, latency, and errors

## 🔧 Troubleshooting

### **Common Issues**

#### **1. SAM Build Fails**
```bash
# Clean and rebuild
sam build --use-container
```

#### **2. Lambda Timeout**
- Increase timeout in `template.yaml`
- Check database connection
- Monitor CloudWatch logs

#### **3. Memory Issues**
- Increase memory in `template.yaml`
- Optimize dependencies
- Remove unnecessary packages

#### **4. Database Connection Issues**
- Verify RDS security groups
- Check Lambda VPC configuration
- Verify database credentials

### **Useful Commands**

```bash
# View SAM logs
sam logs -n ParentingAppFunction --stack-name parenting-app-backend --tail

# Update deployment
sam build && sam deploy

# Delete stack
sam delete

# List stacks
sam list stacks
```

## 🎯 Expected Results

After successful deployment:

✅ **API Gateway URL**: `https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/prod/`

✅ **Lambda Function**: `parenting-app-backend` with full FastAPI app

✅ **Database**: All tables created and ready

✅ **Frontend**: Connected to new backend endpoint

✅ **Authentication**: Login and Google auth working

✅ **AI Chat**: CrewAI agents responding

## 📈 Next Steps

1. **Monitor Performance**: Use CloudWatch to monitor Lambda performance
2. **Scale Up**: Adjust memory and timeout as needed
3. **Add Features**: Deploy new features using `sam build && sam deploy`
4. **Backup**: Set up automated database backups
5. **Security**: Review and tighten security configurations

## 🆘 Support

If you encounter issues:

1. Check CloudWatch logs for error details
2. Verify all environment variables are set correctly
3. Test database connectivity
4. Review SAM template configuration
5. Check API Gateway settings

---

**🎉 Congratulations!** Your full FastAPI backend is now deployed using AWS SAM! 