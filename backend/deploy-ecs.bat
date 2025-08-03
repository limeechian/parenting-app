@echo off
echo Building and deploying FastAPI app to ECS/Fargate...

REM Set variables
set ECR_REPOSITORY_NAME=parenting-app-backend
set ECS_CLUSTER_NAME=parenting-app-cluster
set ECS_SERVICE_NAME=parenting-app-service
set ECS_TASK_DEFINITION_NAME=parenting-app-task
set AWS_REGION=ap-southeast-2
set AWS_ACCOUNT_ID=509624333775

echo Building Docker image...
docker build -t %ECR_REPOSITORY_NAME% .

echo Logging in to Amazon ECR...
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com

echo Creating ECR repository if it doesn't exist...
aws ecr create-repository --repository-name %ECR_REPOSITORY_NAME% --region %AWS_REGION% 2>nul

echo Tagging image...
docker tag %ECR_REPOSITORY_NAME%:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_NAME%:latest

echo Pushing image to ECR...
docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_NAME%:latest

echo Creating ECS cluster if it doesn't exist...
aws ecs create-cluster --cluster-name %ECS_CLUSTER_NAME% --region %AWS_REGION% 2>nul

echo Creating task definition...
aws ecs register-task-definition --cli-input-json file://task-definition.json --region %AWS_REGION%

echo Creating service...
aws ecs create-service --cli-input-json file://service-definition.json --region %AWS_REGION% 2>nul

echo Deployment completed!
echo Check the ECS console for service status. 