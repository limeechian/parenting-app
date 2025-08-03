@echo off
echo Building Database-Enabled Lambda Backend...

REM Clean up previous build
if exist "parenting-app-lambda-database.zip" del "parenting-app-lambda-database.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy source files
echo Copying source files...
copy "..\lambda_function_database.py" "lambda_function.py"
copy "..\crewai_agents.py" "crewai_agents.py"

REM Create requirements file for database version
echo Creating requirements file...
echo # Database and async support > requirements.txt
echo sqlalchemy==2.0.27 >> requirements.txt
echo asyncpg==0.29.0 >> requirements.txt
echo pydantic>=2.7.0 >> requirements.txt
echo typing-extensions==4.9.0 >> requirements.txt
echo. >> requirements.txt
echo # AI and CrewAI >> requirements.txt
echo langchain-core>=0.2.20 >> requirements.txt
echo langchain-openai==0.1.17 >> requirements.txt
echo openai>=1.70.0 >> requirements.txt
echo langchain>=0.2.16 >> requirements.txt
echo crewai==0.70.0 >> requirements.txt
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
echo Creating database-enabled ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda-database.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Database-enabled build finished! Package: parenting-app-lambda-database.zip
echo Package size:
dir parenting-app-lambda-database.zip 