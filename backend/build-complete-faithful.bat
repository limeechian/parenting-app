@echo off
echo Building Complete Faithful Lambda Backend...
echo This includes ALL functions from main.py and crewai_agents.py

REM Clean up previous build
if exist "lambda_function.py" del "lambda_function.py"
if exist "requirements.txt" del "requirements.txt"
if exist "*.zip" del "*.zip"

REM Copy the complete faithful Lambda function
copy "lambda_function_complete.py" "lambda_function.py"

echo Creating requirements file with ALL dependencies...
(
echo fastapi==0.104.1
echo mangum==0.17.0
echo sqlalchemy==2.0.27
echo pg8000==1.30.5
echo typing-extensions==4.9.0
echo pydantic==2.9.2
echo pydantic-core==2.23.4
echo openai==1.39.0
echo crewai==0.70.0
echo langchain==0.2.16
echo langchain-core==0.1.53
echo langchain-openai==0.3.24
echo requests==2.32.3
echo python-dotenv==1.0.1
echo exceptiongroup==1.2.0
echo anyio==4.2.0
echo sniffio==1.3.0
echo passlib==1.7.4
echo bcrypt==4.1.2
echo python-jose==3.3.0
echo python-multipart==0.0.6
echo google-auth==2.28.1
echo google-auth-oauthlib==1.2.0
echo google-auth-httplib2==0.2.0
echo PyJWT==2.8.0
echo numpy==2.3.2
echo httpx==0.28.1
echo httpcore==1.0.9
echo h11==0.16.0
echo annotated-types==0.7.0
echo distro==1.9.0
echo tqdm==4.67.1
echo colorama==0.4.6
echo greenlet==3.2.3
echo scramp==1.4.6
echo python-dateutil==2.9.0.post0
echo six==1.17.0
echo asn1crypto==1.5.1
echo charset-normalizer==3.4.2
echo idna==3.10
echo urllib3==2.5.0
echo certifi==2025.8.3
echo jiter==0.10.0
echo sounddevice==0.5.2
) > requirements.txt

echo Installing dependencies...
pip install -r requirements.txt -t . --platform manylinux2014_x86_64 --implementation cp --python-version 3.9 --only-binary=:all: --upgrade

echo Cleaning up...
for /d %%d in (*.dist-info) do rmdir /s /q "%%d" 2>nul
for /d %%d in (__pycache__) do rmdir /s /q "%%d" 2>nul
for /d %%d in (*.egg-info) do rmdir /s /q "%%d" 2>nul

echo Creating complete faithful ZIP package...
powershell -command "Compress-Archive -Path lambda_function.py,requirements.txt,*.py,*.so,*.dll,*.pyd,*.dist-info,site-packages -DestinationPath parenting-app-lambda-complete-faithful.zip -Force"

echo Complete faithful build finished! Package: parenting-app-lambda-complete-faithful.zip
echo Package size:
dir parenting-app-lambda-complete-faithful.zip 