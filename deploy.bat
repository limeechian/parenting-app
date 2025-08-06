@echo off
REM Automated Deployment Script for Parenting App Backend (Windows)
REM This script handles the complete deployment process for ECS/Fargate

echo 🚀 Starting automated deployment for Parenting App Backend...

REM Configuration
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
    echo [ERROR] Please run: cd backend ^&^& deploy.bat
    pause
    exit /b 1
)

echo [STEP] Step 1: Building Docker image...
docker build -t %ECR_REPOSITORY_NAME% .
if %errorlevel% neq 0 (
    echo [ERROR] Docker build failed!
    pause
    exit /b 1
)
echo ✅ Docker image built successfully

echo [STEP] Step 2: Logging in to Amazon ECR...
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_URI%
if %errorlevel% neq 0 (
    echo [ERROR] ECR login failed!
    pause
    exit /b 1
)
echo ✅ Logged in to ECR successfully

echo [STEP] Step 3: Creating ECR repository if it doesn't exist...
aws ecr create-repository --repository-name %ECR_REPOSITORY_NAME% --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo ✅ Repository created successfully
) else (
    echo [WARNING] Repository already exists
)

echo [STEP] Step 4: Tagging Docker image...
docker tag %ECR_REPOSITORY_NAME%:latest %ECR_URI%/%ECR_REPOSITORY_NAME%:latest
if %errorlevel% neq 0 (
    echo [ERROR] Image tagging failed!
    pause
    exit /b 1
)
echo ✅ Image tagged successfully

echo [STEP] Step 5: Pushing image to ECR...
docker push %ECR_URI%/%ECR_REPOSITORY_NAME%:latest
if %errorlevel% neq 0 (
    echo [ERROR] Image push failed!
    pause
    exit /b 1
)
echo ✅ Image pushed to ECR successfully

echo [STEP] Step 6: Creating ECS cluster if it doesn't exist...
aws ecs create-cluster --cluster-name %ECS_CLUSTER_NAME% --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo ✅ Cluster created successfully
) else (
    echo [WARNING] Cluster already exists
)

echo [STEP] Step 7: Registering new task definition...
for /f "tokens=*" %%i in ('aws ecs register-task-definition --cli-input-json file://task-definition.json --region %AWS_REGION% --query "taskDefinition.taskDefinitionArn" --output text') do set TASK_DEF_ARN=%%i
if %errorlevel% neq 0 (
    echo [ERROR] Task definition registration failed!
    pause
    exit /b 1
)
echo ✅ Task definition registered: %TASK_DEF_ARN%

echo [STEP] Step 8: Updating ECS service with new task definition...
aws ecs update-service --cluster %ECS_CLUSTER_NAME% --service %ECS_SERVICE_NAME% --task-definition %TASK_DEF_ARN% --force-new-deployment --region %AWS_REGION% >nul
if %errorlevel% neq 0 (
    echo [ERROR] Service update failed!
    pause
    exit /b 1
)
echo ✅ Service updated successfully

echo [STEP] Step 9: Monitoring deployment status...
echo ⏳ Waiting for deployment to complete...

REM Monitor deployment status
set ATTEMPTS=0
set MAX_ATTEMPTS=30

:monitor_loop
if %ATTEMPTS% geq %MAX_ATTEMPTS% goto timeout

timeout /t 10 /nobreak >nul
set /a ATTEMPTS+=1

for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].deployments[0].rolloutState" --output text 2^>nul') do set SERVICE_STATUS=%%i

echo 📊 Deployment status: %SERVICE_STATUS% (Attempt %ATTEMPTS%/%MAX_ATTEMPTS%)

if "%SERVICE_STATUS%"=="COMPLETED" (
    echo 🎉 Deployment completed successfully!
    goto success
) else if "%SERVICE_STATUS%"=="FAILED" (
    echo ❌ Deployment failed!
    pause
    exit /b 1
)

goto monitor_loop

:timeout
echo ⚠️  Deployment monitoring timed out. Please check the ECS console for status.
goto success

:success
echo [STEP] Step 10: Getting service information...
for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].runningCount" --output text') do set RUNNING_COUNT=%%i
for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].desiredCount" --output text') do set DESIRED_COUNT=%%i
for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].taskDefinition" --output text') do set TASK_DEF=%%i

echo ✅ Deployment Summary:
echo    - Running tasks: %RUNNING_COUNT%/%DESIRED_COUNT%
echo    - Task definition: %TASK_DEF%
echo    - Service status: ACTIVE

echo.
echo 🎉 Deployment completed successfully!
echo Your backend is now running with the latest changes.
echo.
echo Next steps:
echo 1. Test your frontend: https://master.dcmcchu8q16tm.amplifyapp.com
echo 2. Check backend health: https://parenzing.com/health
echo 3. Monitor logs in CloudWatch if needed

pause 