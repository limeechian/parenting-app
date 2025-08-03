@echo off
echo Building Simple Direct Lambda Backend...

REM Clean up previous build
if exist "parenting-app-lambda-simple-direct.zip" del "parenting-app-lambda-simple-direct.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy simple source files
echo Copying source files...
copy "..\lambda_function_simple_direct.py" "lambda_function.py"

REM No external dependencies needed for this simple handler
echo No external dependencies needed for simple handler.

REM Create ZIP file
echo Creating simple direct ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda-simple-direct.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Simple direct build finished! Package: parenting-app-lambda-simple-direct.zip
echo Package size:
dir parenting-app-lambda-simple-direct.zip 