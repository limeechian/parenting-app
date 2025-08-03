@echo off
echo Building Simple Database-Enabled Lambda Backend...

REM Clean up previous build
if exist "parenting-app-lambda-database-simple.zip" del "parenting-app-lambda-database-simple.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy source files
echo Copying source files...
copy "..\lambda_function_database_simple.py" "lambda_function.py"

REM Create requirements file for simple database version
echo Creating requirements file...
echo # Database and sync support > requirements.txt
echo sqlalchemy==2.0.27 >> requirements.txt
echo psycopg2-binary==2.9.9 >> requirements.txt
echo typing-extensions==4.9.0 >> requirements.txt
echo. >> requirements.txt
echo # AI support (minimal) >> requirements.txt
echo openai>=1.70.0 >> requirements.txt
echo. >> requirements.txt
echo # Basic utilities >> requirements.txt
echo requests==2.32.3 >> requirements.txt
echo python-dotenv==1.0.1 >> requirements.txt
echo exceptiongroup==1.2.0 >> requirements.txt
echo anyio==4.2.0 >> requirements.txt
echo sniffio==1.3.0 >> requirements.txt

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -t .

REM Clean up unnecessary files
echo Cleaning up...
if exist "*.dist-info" rmdir /s "*.dist-info"
if exist "*.pyc" del "*.pyc"
if exist "__pycache__" rmdir /s "__pycache__"

REM Create ZIP file
echo Creating simple database-enabled ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda-database-simple.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Simple database-enabled build finished! Package: parenting-app-lambda-database-simple.zip
echo Package size:
dir parenting-app-lambda-database-simple.zip 