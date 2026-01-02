@echo off
REM Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
REM Program Name: verify-aws-resources.bat
REM Description: To verify AWS resources status before deployment
REM First Written on: Sunday, 10-Dec-2025

echo ========================================
echo AWS Resources Verification Script
echo ========================================
echo.

REM Configuration
set AWS_REGION=ap-southeast-2
set AWS_ACCOUNT_ID=509624333775
set ECR_REPOSITORY_NAME=parenting-app-backend
set ECS_CLUSTER_NAME=parenting-app-cluster
set ECS_SERVICE_NAME=parenting-app-service
set ECS_TASK_DEFINITION_NAME=parenting-app-task
set LOG_GROUP=/ecs/parenting-app-backend

echo [1/7] Checking AWS credentials...
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] AWS credentials not configured or invalid!
    echo Please run: aws configure
    pause
    exit /b 1
)
echo [OK] AWS credentials are valid
echo.

echo [2/7] Checking ECR Repository...
aws ecr describe-repositories --repository-names %ECR_REPOSITORY_NAME% --region %AWS_REGION% >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] ECR Repository exists: %ECR_REPOSITORY_NAME%
) else (
    echo [WARNING] ECR Repository does not exist. It will be created during deployment.
)
echo.

echo [3/7] Checking ECS Cluster...
aws ecs describe-clusters --clusters %ECS_CLUSTER_NAME% --region %AWS_REGION% --query "clusters[0].status" --output text >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('aws ecs describe-clusters --clusters %ECS_CLUSTER_NAME% --region %AWS_REGION% --query "clusters[0].status" --output text 2^>nul') do set CLUSTER_STATUS=%%i
    echo [OK] ECS Cluster exists: %ECS_CLUSTER_NAME% (Status: %CLUSTER_STATUS%)
) else (
    echo [WARNING] ECS Cluster does not exist. It will be created during deployment.
)
echo.

echo [4/7] Checking ECS Service...
aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].status" --output text 2^>nul') do set SERVICE_STATUS=%%i
    for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].desiredCount" --output text 2^>nul') do set DESIRED_COUNT=%%i
    for /f "tokens=*" %%i in ('aws ecs describe-services --cluster %ECS_CLUSTER_NAME% --services %ECS_SERVICE_NAME% --region %AWS_REGION% --query "services[0].runningCount" --output text 2^>nul') do set RUNNING_COUNT=%%i
    echo [OK] ECS Service exists: %ECS_SERVICE_NAME%
    echo      Status: %SERVICE_STATUS%
    echo      Running Tasks: %RUNNING_COUNT%/%DESIRED_COUNT%
    if "%RUNNING_COUNT%"=="0" (
        echo [WARNING] Service is running 0 tasks. You may need to restart it.
    )
) else (
    echo [WARNING] ECS Service does not exist. You may need to create it first.
    echo           Check service-definition.json and run deploy-ecs.bat if needed.
)
echo.

echo [5/7] Checking IAM Roles...
aws iam get-role --role-name ecsTaskExecutionRole >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] IAM Role exists: ecsTaskExecutionRole
) else (
    echo [ERROR] IAM Role missing: ecsTaskExecutionRole
    echo         Run: setup-iam-roles.bat
)

aws iam get-role --role-name ecsTaskRole >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] IAM Role exists: ecsTaskRole
) else (
    echo [ERROR] IAM Role missing: ecsTaskRole
    echo         Run: setup-iam-roles.bat
)
echo.

echo [6/7] Checking CloudWatch Log Group...
aws logs describe-log-groups --log-group-name-prefix %LOG_GROUP% --region %AWS_REGION% --query "logGroups[?logGroupName=='%LOG_GROUP%'].logGroupName" --output text >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] CloudWatch Log Group exists: %LOG_GROUP%
) else (
    echo [WARNING] CloudWatch Log Group may not exist. It will be created automatically.
)
echo.

echo [7/7] Checking Task Definition...
aws ecs describe-task-definition --task-definition %ECS_TASK_DEFINITION_NAME% --region %AWS_REGION% >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Task Definition exists: %ECS_TASK_DEFINITION_NAME%
) else (
    echo [INFO] Task Definition will be registered during deployment.
)
echo.

echo ========================================
echo Verification Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Review any warnings or errors above
echo 2. If IAM roles are missing, run: setup-iam-roles.bat
echo 3. If service is stopped, restart it or run deploy.bat
echo 4. Verify environment variables in task-definition.json
echo.
pause

