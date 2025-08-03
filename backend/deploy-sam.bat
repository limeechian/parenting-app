@echo off
echo Deploying Parenting App Backend using AWS SAM...

REM Check if SAM CLI is installed
sam --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS SAM CLI is not installed or not in PATH
    echo Please install it first: pip install --user aws-sam-cli
    pause
    exit /b 1
)

REM Build the SAM application
echo Building SAM application...
sam build

if errorlevel 1 (
    echo ERROR: SAM build failed
    pause
    exit /b 1
)

REM Deploy the SAM application
echo Deploying SAM application...
sam deploy --guided

if errorlevel 1 (
    echo ERROR: SAM deployment failed
    pause
    exit /b 1
)

echo Deployment completed successfully!
echo.
echo Next steps:
echo 1. Update your frontend API URL to use the new SAM endpoint
echo 2. Test the application
echo 3. Set up database tables using database-setup.sql
pause 