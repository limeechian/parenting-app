#!/bin/bash

# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: verify-aws-resources.sh
# Description: To verify AWS resources status before deployment
# First Written on: Sunday, 10-Dec-2025

set -e

echo "========================================"
echo "AWS Resources Verification Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="ap-southeast-2"
AWS_ACCOUNT_ID="509624333775"
ECR_REPOSITORY_NAME="parenting-app-backend"
ECS_CLUSTER_NAME="parenting-app-cluster"
ECS_SERVICE_NAME="parenting-app-service"
ECS_TASK_DEFINITION_NAME="parenting-app-task"
LOG_GROUP="/ecs/parenting-app-backend"

print_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "[1/7] Checking AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    print_ok "AWS credentials are valid"
else
    print_error "AWS credentials not configured or invalid!"
    echo "Please run: aws configure"
    exit 1
fi
echo ""

echo "[2/7] Checking ECR Repository..."
if aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} > /dev/null 2>&1; then
    print_ok "ECR Repository exists: ${ECR_REPOSITORY_NAME}"
else
    print_warning "ECR Repository does not exist. It will be created during deployment."
fi
echo ""

echo "[3/7] Checking ECS Cluster..."
CLUSTER_STATUS=$(aws ecs describe-clusters --clusters ${ECS_CLUSTER_NAME} --region ${AWS_REGION} --query "clusters[0].status" --output text 2>/dev/null || echo "NOT_FOUND")
if [ "$CLUSTER_STATUS" != "NOT_FOUND" ] && [ "$CLUSTER_STATUS" != "None" ]; then
    print_ok "ECS Cluster exists: ${ECS_CLUSTER_NAME} (Status: ${CLUSTER_STATUS})"
else
    print_warning "ECS Cluster does not exist. It will be created during deployment."
fi
echo ""

echo "[4/7] Checking ECS Service..."
if aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION} > /dev/null 2>&1; then
    SERVICE_STATUS=$(aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION} --query "services[0].status" --output text 2>/dev/null || echo "UNKNOWN")
    DESIRED_COUNT=$(aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION} --query "services[0].desiredCount" --output text 2>/dev/null || echo "0")
    RUNNING_COUNT=$(aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION} --query "services[0].runningCount" --output text 2>/dev/null || echo "0")
    
    print_ok "ECS Service exists: ${ECS_SERVICE_NAME}"
    echo "      Status: ${SERVICE_STATUS}"
    echo "      Running Tasks: ${RUNNING_COUNT}/${DESIRED_COUNT}"
    
    if [ "$RUNNING_COUNT" = "0" ]; then
        print_warning "Service is running 0 tasks. You may need to restart it."
    fi
else
    print_warning "ECS Service does not exist. You may need to create it first."
    echo "           Check service-definition.json and run deploy-ecs.bat if needed."
fi
echo ""

echo "[5/7] Checking IAM Roles..."
if aws iam get-role --role-name ecsTaskExecutionRole > /dev/null 2>&1; then
    print_ok "IAM Role exists: ecsTaskExecutionRole"
else
    print_error "IAM Role missing: ecsTaskExecutionRole"
    echo "         Run: ./setup-iam-roles.sh (or setup-iam-roles.bat on Windows)"
fi

if aws iam get-role --role-name ecsTaskRole > /dev/null 2>&1; then
    print_ok "IAM Role exists: ecsTaskRole"
else
    print_error "IAM Role missing: ecsTaskRole"
    echo "         Run: ./setup-iam-roles.sh (or setup-iam-roles.bat on Windows)"
fi
echo ""

echo "[6/7] Checking CloudWatch Log Group..."
if aws logs describe-log-groups --log-group-name-prefix ${LOG_GROUP} --region ${AWS_REGION} --query "logGroups[?logGroupName=='${LOG_GROUP}'].logGroupName" --output text 2>/dev/null | grep -q "${LOG_GROUP}"; then
    print_ok "CloudWatch Log Group exists: ${LOG_GROUP}"
else
    print_warning "CloudWatch Log Group may not exist. It will be created automatically."
fi
echo ""

echo "[7/7] Checking Task Definition..."
if aws ecs describe-task-definition --task-definition ${ECS_TASK_DEFINITION_NAME} --region ${AWS_REGION} > /dev/null 2>&1; then
    print_ok "Task Definition exists: ${ECS_TASK_DEFINITION_NAME}"
else
    print_info "Task Definition will be registered during deployment."
fi
echo ""

echo "========================================"
echo "Verification Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Review any warnings or errors above"
echo "2. If IAM roles are missing, run: ./setup-iam-roles.sh"
echo "3. If service is stopped, restart it or run ./deploy.sh"
echo "4. Verify environment variables in task-definition.json"
echo ""



