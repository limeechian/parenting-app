#!/bin/bash

# Automated Deployment Script for Parenting App Backend
# This script handles the complete deployment process for ECS/Fargate

set -e

echo "🚀 Starting automated deployment for Parenting App Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
ECR_REPOSITORY_NAME="parenting-app-backend"
ECS_CLUSTER_NAME="parenting-app-cluster"
ECS_SERVICE_NAME="parenting-app-service"
ECS_TASK_DEFINITION_NAME="parenting-app-task"
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID="509624333775"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

# Check if we're in the backend directory
if [ ! -f "main.py" ]; then
    print_error "This script must be run from the backend directory."
    print_error "Please run: cd backend && ./deploy.sh"
    exit 1
fi

print_step "Step 1: Building Docker image..."
docker build -t ${ECR_REPOSITORY_NAME} .
print_status "✅ Docker image built successfully"

print_step "Step 2: Logging in to Amazon ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}
print_status "✅ Logged in to ECR successfully"

print_step "Step 3: Creating ECR repository if it doesn't exist..."
aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} 2>/dev/null || print_warning "Repository already exists"

print_step "Step 4: Tagging Docker image..."
docker tag ${ECR_REPOSITORY_NAME}:latest ${ECR_URI}/${ECR_REPOSITORY_NAME}:latest
print_status "✅ Image tagged successfully"

print_step "Step 5: Pushing image to ECR..."
docker push ${ECR_URI}/${ECR_REPOSITORY_NAME}:latest
print_status "✅ Image pushed to ECR successfully"

print_step "Step 6: Creating ECS cluster if it doesn't exist..."
aws ecs create-cluster --cluster-name ${ECS_CLUSTER_NAME} --region ${AWS_REGION} 2>/dev/null || print_warning "Cluster already exists"

print_step "Step 7: Registering new task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://task-definition.json --region ${AWS_REGION} --query 'taskDefinition.taskDefinitionArn' --output text)
print_status "✅ Task definition registered: ${TASK_DEF_ARN}"

print_step "Step 8: Updating ECS service with new task definition..."
aws ecs update-service \
    --cluster ${ECS_CLUSTER_NAME} \
    --service ${ECS_SERVICE_NAME} \
    --task-definition ${TASK_DEF_ARN} \
    --force-new-deployment \
    --region ${AWS_REGION} > /dev/null
print_status "✅ Service updated successfully"

print_step "Step 9: Monitoring deployment status..."
echo "⏳ Waiting for deployment to complete..."

# Monitor deployment status
DEPLOYMENT_COMPLETE=false
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ "$DEPLOYMENT_COMPLETE" = false ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep 10
    ATTEMPTS=$((ATTEMPTS + 1))
    
    # Get service status
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER_NAME} \
        --services ${ECS_SERVICE_NAME} \
        --region ${AWS_REGION} \
        --query 'services[0].deployments[0].rolloutState' \
        --output text 2>/dev/null)
    
    echo "📊 Deployment status: $SERVICE_STATUS (Attempt $ATTEMPTS/$MAX_ATTEMPTS)"
    
    if [ "$SERVICE_STATUS" = "COMPLETED" ]; then
        DEPLOYMENT_COMPLETE=true
        print_status "🎉 Deployment completed successfully!"
    elif [ "$SERVICE_STATUS" = "FAILED" ]; then
        print_error "❌ Deployment failed!"
        exit 1
    fi
done

if [ "$DEPLOYMENT_COMPLETE" = false ]; then
    print_warning "⚠️  Deployment monitoring timed out. Please check the ECS console for status."
fi

# Get final service info
print_step "Step 10: Getting service information..."
SERVICE_INFO=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER_NAME} \
    --services ${ECS_SERVICE_NAME} \
    --region ${AWS_REGION} \
    --query 'services[0]' \
    --output json)

RUNNING_COUNT=$(echo $SERVICE_INFO | jq -r '.runningCount')
DESIRED_COUNT=$(echo $SERVICE_INFO | jq -r '.desiredCount')
TASK_DEF=$(echo $SERVICE_INFO | jq -r '.taskDefinition')

print_status "✅ Deployment Summary:"
print_status "   - Running tasks: $RUNNING_COUNT/$DESIRED_COUNT"
print_status "   - Task definition: $TASK_DEF"
print_status "   - Service status: ACTIVE"

echo ""
print_status "🎉 Deployment completed successfully!"
print_status "Your backend is now running with the latest changes."
print_status ""
print_status "Next steps:"
print_status "1. Test your frontend: https://master.dcmcchu8q16tm.amplifyapp.com"
print_status "2. Check backend health: https://parenzing.com/health"
print_status "3. Monitor logs in CloudWatch if needed" 