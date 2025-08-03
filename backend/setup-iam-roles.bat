@echo off
echo Setting up IAM roles for ECS deployment...

REM Create ECS Task Execution Role
echo Creating ECS Task Execution Role...
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json 2>nul

echo Attaching ECS Task Execution Role Policy...
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

REM Create ECS Task Role
echo Creating ECS Task Role...
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy.json 2>nul

echo Creating custom policy for ECS Task Role...
aws iam put-role-policy --role-name ecsTaskRole --policy-name ECSTaskPolicy --policy-document file://task-policy.json

echo IAM roles setup completed! 