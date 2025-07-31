# Quick Start: Deploy to AWS in 30 Minutes

This is a condensed guide to get your parenting app deployed to AWS quickly.

## Prerequisites Checklist

- [ ] AWS account (sign up at aws.amazon.com)
- [ ] GitHub account
- [ ] AWS CLI installed: `pip install awscli`
- [ ] AWS SAM CLI installed: `pip install aws-sam-cli`
- [ ] Your code pushed to GitHub

## Step 1: AWS Setup (5 minutes)

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID and Secret Access Key
   # Region: us-east-1
   # Output: json
   ```

2. **Create IAM User** (if using root account)
   - Go to AWS IAM Console
   - Create user with AdministratorAccess policy
   - Generate access keys

## Step 2: Database Setup (10 minutes)

1. **Create RDS Instance**
   - Go to AWS RDS Console
   - Click "Create database"
   - Choose "PostgreSQL" → "Free tier"
   - Set identifier: `parenting-app-db`
   - Set username: `admin`
   - Set password: `your-secure-password`
   - Enable "Public access"
   - Click "Create database"

2. **Wait for database to be available** (5-10 minutes)

3. **Run database setup**
   - Connect using pgAdmin or DBeaver
   - Run the `database-setup.sql` script

## Step 3: Backend Deployment (10 minutes)

1. **Set environment variables**
   ```bash
   cd backend
   cp env-aws-template.txt .env
   # Edit .env with your actual values
   ```

2. **Deploy backend**
   ```bash
   cd ..
   ./deploy.sh
   ```

3. **Note the API Gateway URL** from the output

## Step 4: Frontend Deployment (5 minutes)

1. **Go to AWS Amplify Console**
   - Visit: https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect GitHub**
   - Choose GitHub as provider
   - Connect your account
   - Select your repository

3. **Configure build**
   - Build image: Ubuntu 18.01
   - Build commands:
     ```bash
     npm ci
     npm run build
     ```
   - Output directory: `build`

4. **Add environment variables**
   - `REACT_APP_API_URL`: Your API Gateway URL
   - Add your Firebase configuration

5. **Deploy**
   - Click "Save and deploy"

## Step 5: Test (5 minutes)

1. **Test backend**
   ```bash
   curl https://your-api-gateway-url/prod/test
   ```

2. **Test frontend**
   - Open your Amplify app URL
   - Test login and chat functionality

## Troubleshooting Quick Fixes

### Backend Issues
- **Lambda timeout**: Increase timeout in `template.yaml`
- **Package too large**: Remove unnecessary dependencies
- **Database connection**: Check security group settings

### Frontend Issues
- **Build fails**: Check Node.js version compatibility
- **API not found**: Verify `REACT_APP_API_URL` environment variable
- **CORS errors**: Check API Gateway CORS settings

### Database Issues
- **Connection refused**: Enable public access in RDS
- **Authentication failed**: Check username/password
- **Tables not found**: Run `database-setup.sql`

## Cost Monitoring

- **Free tier**: 12 months, then ~$20-30/month
- **Set up billing alerts** in AWS Console
- **Monitor usage** in CloudWatch

## Next Steps

After successful deployment:
1. Set up custom domain
2. Configure SSL certificates
3. Set up monitoring and alerts
4. Optimize performance
5. Add advanced features

## Support

- **AWS Documentation**: https://docs.aws.amazon.com/
- **CloudWatch Logs**: Check for errors
- **AWS Support**: Available with paid plans

---

**🎉 Congratulations!** Your parenting app is now deployed on AWS! 