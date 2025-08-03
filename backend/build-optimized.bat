@echo off
echo Building Optimized Lambda deployment package for Parenting App Backend...

REM Clean up previous build
if exist "parenting-app-lambda-optimized.zip" del "parenting-app-lambda-optimized.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy only essential source files
echo Copying source files...
copy "..\lambda_function_optimized.py" "lambda_function.py"
copy "..\crewai_agents.py" .
copy "..\requirements-lambda-optimized.txt" "requirements.txt"

REM Install dependencies with optimized settings
echo Installing dependencies...
pip install -r requirements.txt --platform manylinux2014_x86_64 --target=. --implementation cp --python-version 3.9 --only-binary=:all: --upgrade --no-deps

REM Aggressive cleanup to reduce package size
echo Cleaning up package...
for /d %%d in (*) do (
    if "%%d"=="__pycache__" rmdir /s "%%d" 2>nul
    if "%%d"=="tests" rmdir /s "%%d" 2>nul
    if "%%d"=="test_*" rmdir /s "%%d" 2>nul
    if "%%d"=="debug_*" rmdir /s "%%d" 2>nul
    if "%%d"=="check_*" rmdir /s "%%d" 2>nul
    if "%%d"=="fix_*" rmdir /s "%%d" 2>nul
    if "%%d"=="docs" rmdir /s "%%d" 2>nul
    if "%%d"=="examples" rmdir /s "%%d" 2>nul
    if "%%d"=="samples" rmdir /s "%%d" 2>nul
    if "%%d"=="jupyter" rmdir /s "%%d" 2>nul
    if "%%d"=="notebook" rmdir /s "%%d" 2>nul
    if "%%d"=="ipython" rmdir /s "%%d" 2>nul
    if "%%d"=="*.dist-info" rmdir /s "%%d" 2>nul
    if "%%d"=="*.egg-info" rmdir /s "%%d" 2>nul
)

REM Remove unnecessary files
del /q *.pyc 2>nul
del /q *.pyo 2>nul
del /q *.pyd 2>nul
del /q *.so 2>nul
del /q *.dll 2>nul
del /q *.exe 2>nul
del /q *.md 2>nul
del /q *.txt 2>nul
del /q *.rst 2>nul
del /q *.html 2>nul
del /q *.css 2>nul
del /q *.js 2>nul
del /q *.json 2>nul
del /q *.yaml 2>nul
del /q *.yml 2>nul

REM Keep only essential files
copy "requirements.txt" .

REM Remove large unused packages (if they exist)
if exist "langchain" rmdir /s "langchain" 2>nul
if exist "langchain_community" rmdir /s "langchain_community" 2>nul
if exist "alembic" rmdir /s "alembic" 2>nul
if exist "google_auth" rmdir /s "google_auth" 2>nul

REM Create ZIP file
echo Creating optimized ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda-optimized.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Optimized build complete! Package: parenting-app-lambda-optimized.zip
echo Package size:
dir parenting-app-lambda-optimized.zip 