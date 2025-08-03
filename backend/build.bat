@echo off
echo Building Lambda deployment package for Parenting App Backend...

REM Clean up previous build
if exist "parenting-app-lambda.zip" del "parenting-app-lambda.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy essential source files
echo Copying source files...
copy "..\main.py" .
copy "..\crewai_agents.py" .
copy "..\lambda_function.py" .
copy "..\lambda_function_simple.py" .
copy "..\lambda_function_progressive.py" .
copy "..\lambda_function_optimized.py" .
copy "..\requirements-lambda.txt" .

REM Install dependencies
echo Installing dependencies...
pip install -r requirements-lambda.txt --platform manylinux2014_x86_64 --target=. --implementation cp --python-version 3.9 --only-binary=:all: --upgrade

REM Remove unnecessary files and folders to reduce package size
echo Cleaning up package...
for /d %%d in (*) do (
    if "%%d"=="__pycache__" rmdir /s "%%d"
    if "%%d"=="tests" rmdir /s "%%d"
    if "%%d"=="test_*" rmdir /s "%%d"
    if "%%d"=="debug_*" rmdir /s "%%d"
    if "%%d"=="check_*" rmdir /s "%%d"
    if "%%d"=="fix_*" rmdir /s "%%d"
    if "%%d"=="docs" rmdir /s "%%d"
    if "%%d"=="examples" rmdir /s "%%d"
    if "%%d"=="samples" rmdir /s "%%d"
    if "%%d"=="jupyter" rmdir /s "%%d"
    if "%%d"=="notebook" rmdir /s "%%d"
    if "%%d"=="ipython" rmdir /s "%%d"
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

REM Keep requirements file
copy "requirements-lambda.txt" .

REM Create ZIP file
echo Creating ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Build complete! Package: parenting-app-lambda.zip
echo Package size:
dir parenting-app-lambda.zip 