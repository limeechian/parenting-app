#!/bin/bash

# AWS Deployment Script for Parenting App
# This script deploys the entire application to AWS

set -e

echo "🚀 Starting AWS Deployment for Parenting App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    print_warning "AWS SAM CLI is not installed. Installing..."
    pip install aws-sam-cli
fi

# Check if required environment variables are set
if [ -z "$AWS_REGION" ]; then
    print_warning "AWS_REGION not set, using us-east-1"
    export AWS_REGION=us-east-1
fi

print_status "Deployment will use region: $AWS_REGION"

# Step 1: Deploy Backend (Lambda + API Gateway)
print_status "Step 1: Deploying Backend (Lambda + API Gateway)..."

cd backend

# Build Lambda package
print_status "Building Lambda package..."
chmod +x build.sh
./build.sh

# Deploy using SAM
print_status "Deploying with SAM..."
sam build
sam deploy --guided

# Get the API Gateway URL
API_URL=$(aws cloudformation describe-stacks --stack-name parenting-app --query 'Stacks[0].Outputs[?OutputKey==`ParentingAppApi`].OutputValue' --output text)

print_status "Backend deployed successfully!"
print_status "API Gateway URL: $API_URL"

cd ..

# Step 2: Deploy Frontend (Amplify)
print_status "Step 2: Frontend deployment instructions..."

echo ""
echo "📋 Frontend Deployment Steps:"
echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Click 'New app' → 'Host web app'"
echo "3. Choose GitHub as your repository provider"
echo "4. Connect your GitHub account and select your repository"
echo "5. Configure build settings:"
echo "   - Build image: Ubuntu 18.01"
echo "   - Build commands:"
echo "     - npm ci"
echo "     - npm run build"
echo "   - Output directory: build"
echo "6. Add environment variables:"
echo "   - REACT_APP_API_URL: $API_URL"
echo "7. Deploy!"

print_status "Deployment script completed!"
print_status "Next steps:"
echo "1. Deploy frontend using AWS Amplify Console"
echo "2. Update frontend environment variables with API URL: $API_URL"
echo "3. Test the complete application"
echo "4. Set up monitoring with CloudWatch"

echo ""
print_status "🎉 Deployment setup complete!" 