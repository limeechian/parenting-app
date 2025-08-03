@echo off
echo Building Minimal Lambda Backend...

REM Clean up previous build
if exist "parenting-app-lambda-minimal.zip" del "parenting-app-lambda-minimal.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy source files
echo Copying source files...
copy "..\lambda_function_minimal.py" "lambda_function.py"

REM Create ZIP file (no dependencies needed)
echo Creating minimal ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda-minimal.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Minimal build finished! Package: parenting-app-lambda-minimal.zip
echo Package size:
dir parenting-app-lambda-minimal.zip 