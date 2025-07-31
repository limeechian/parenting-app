#!/bin/bash

# Build script for AWS Lambda deployment

echo "Building Lambda package..."

# Create build directory
mkdir -p build

# Copy source files
cp *.py build/
cp requirements-lambda.txt build/requirements.txt

# Install dependencies
cd build
pip install -r requirements.txt -t .

# Remove unnecessary files to reduce package size
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -type d -name "*.pyc" -delete
find . -type d -name "tests" -exec rm -rf {} +
find . -type d -name "test_*" -exec rm -rf {} +

# Create deployment package
zip -r ../parenting-app-lambda.zip .

echo "Build complete! Package: parenting-app-lambda.zip" 