@echo off
echo Fixing API Gateway proxy integration...

REM Get the Lambda function ARN
for /f "tokens=*" %%i in ('aws lambda get-function --function-name parenting-app-backend --query "Configuration.FunctionArn" --output text') do set LAMBDA_ARN=%%i

echo Lambda ARN: %LAMBDA_ARN%

REM Create proxy resource
echo Creating proxy resource...
aws apigateway create-resource --rest-api-id 5e0em7cm60 --parent-id fqc91p2tj8 --path-part "{proxy+}"

REM Get the proxy resource ID
for /f "tokens=*" %%i in ('aws apigateway get-resources --rest-api-id 5e0em7cm60 --query "items[?pathPart=='{proxy+}'].id" --output text') do set PROXY_RESOURCE_ID=%%i

echo Proxy Resource ID: %PROXY_RESOURCE_ID%

REM Create ANY method for proxy resource
echo Creating ANY method for proxy resource...
aws apigateway put-method --rest-api-id 5e0em7cm60 --resource-id %PROXY_RESOURCE_ID% --http-method ANY --authorization-type NONE

REM Create Lambda integration for proxy resource
echo Creating Lambda integration...
aws apigateway put-integration --rest-api-id 5e0em7cm60 --resource-id %PROXY_RESOURCE_ID% --http-method ANY --type AWS_PROXY --integration-http-method POST --uri arn:aws:apigateway:ap-southeast-2:lambda:path/2015-03-31/functions/%LAMBDA_ARN%/invocations

REM Add Lambda permission for API Gateway
echo Adding Lambda permission...
aws lambda add-permission --function-name parenting-app-backend --statement-id apigateway-proxy --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:ap-southeast-2:509624333775:5e0em7cm60/*/*"

REM Create deployment
echo Creating deployment...
aws apigateway create-deployment --rest-api-id 5e0em7cm60 --stage-name prod

echo API Gateway proxy integration completed!
echo Test URL: https://5e0em7cm60.execute-api.ap-southeast-2.amazonaws.com/prod/test 