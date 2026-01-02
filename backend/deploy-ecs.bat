REM Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
REM Program Name: deploy-ecs.bat
REM Description: To build Docker image and deploy FastAPI application to ECS/Fargate
REM First Written on: Monday, 29-Sep-2025
REM Edited on: Sunday, 10-Dec-2025

@echo off
REM Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
REM Program Name: deploy-ecs.bat
REM Description: To build Docker image and deploy FastAPI application to ECS/Fargate
REM First Written on: Monday, 29-Sep-2025
REM Edited on: Sunday, 10-Dec-2025
REM NOTE: This is a simpler deployment script. For full deployment with monitoring, use deploy.bat

echo Building and deploying FastAPI app to ECS/Fargate...

REM Set variables
set ECR_REPOSITORY_NAME=parenting-app-backend
set ECS_CLUSTER_NAME=parenting-app-cluster
set ECS_SERVICE_NAME=parenting-app-service
set ECS_TASK_DEFINITION_NAME=parenting-app-task
set AWS_REGION=ap-southeast-2
set AWS_ACCOUNT_ID=509624333775
set ECR_URI=%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com

REM Check if we're in the backend directory
if not exist "main.py" (
    echo [ERROR] This script must be run from the backend directory.
    echo [ERROR] Please run: cd backend ^&^& deploy-ecs.bat
    pause
    exit /b 1
)

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo [ERROR] Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Building Docker image...
docker build -t %ECR_REPOSITORY_NAME% .

echo Logging in to Amazon ECR...
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_URI%
if %errorlevel% neq 0 (
    echo [ERROR] ECR login failed!
    pause
    exit /b 1
)

echo Creating ECR repository if it doesn't exist...
aws ecr create-repository --repository-name %ECR_REPOSITORY_NAME% --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo Repository created successfully
) else (
    echo Repository already exists
)

echo Tagging image...
docker tag %ECR_REPOSITORY_NAME%:latest %ECR_URI%/%ECR_REPOSITORY_NAME%:latest
if %errorlevel% neq 0 (
    echo [ERROR] Image tagging failed!
    pause
    exit /b 1
)

echo Pushing image to ECR...
docker push %ECR_URI%/%ECR_REPOSITORY_NAME%:latest
if %errorlevel% neq 0 (
    echo [ERROR] Image push failed!
    pause
    exit /b 1
)

echo Creating ECS cluster if it doesn't exist...
aws ecs create-cluster --cluster-name %ECS_CLUSTER_NAME% --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo Cluster created successfully
) else (
    echo Cluster already exists
)

echo Creating task definition...
aws ecs register-task-definition --cli-input-json file://task-definition.json --region %AWS_REGION%
if %errorlevel% neq 0 (
    echo [ERROR] Task definition registration failed!
    pause
    exit /b 1
)

echo Creating service (if it doesn't exist)...
aws ecs create-service --cli-input-json file://service-definition.json --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo Service created successfully
) else (
    echo Service already exists - updating instead...
    for /f "tokens=*" %%i in ('aws ecs register-task-definition --cli-input-json file://task-definition.json --region %AWS_REGION% --query "taskDefinition.taskDefinitionArn" --output text') do set TASK_DEF_ARN=%%i
    aws ecs update-service --cluster %ECS_CLUSTER_NAME% --service %ECS_SERVICE_NAME% --task-definition %TASK_DEF_ARN% --force-new-deployment --region %AWS_REGION%
)

echo.
echo Deployment completed!
echo Check the ECS console for service status.
echo For full deployment with monitoring, use deploy.bat instead.
pause 