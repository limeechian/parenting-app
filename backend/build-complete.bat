@echo off
echo Building Complete FastAPI Backend for Lambda...

REM Clean up previous build
if exist "parenting-app-lambda-complete.zip" del "parenting-app-lambda-complete.zip"
if exist "build" rmdir /s "build"

REM Create build directory
mkdir build
cd build

REM Copy complete source files
echo Copying source files...
copy "..\main.py" .
copy "..\crewai_agents.py" .
copy "..\lambda_function_complete.py" "lambda_function.py"
copy "..\requirements-lambda.txt" "requirements.txt"

REM Install all dependencies
echo Installing dependencies...
pip install -r requirements.txt --platform manylinux2014_x86_64 --target=. --implementation cp --python-version 3.9 --only-binary=:all: --upgrade

REM Clean up package to reduce size
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

REM Keep requirements file
copy "requirements.txt" .

REM Create ZIP file
echo Creating complete ZIP package...
powershell Compress-Archive -Path * -DestinationPath "..\parenting-app-lambda-complete.zip" -Force

REM Go back to parent directory
cd ..

REM Clean up build directory
rmdir /s "build"

echo Complete build finished! Package: parenting-app-lambda-complete.zip
echo Package size:
dir parenting-app-lambda-complete.zip 