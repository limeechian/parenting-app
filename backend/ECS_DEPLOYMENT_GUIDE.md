# ECS/Fargate Deployment Guide for FastAPI Backend

This guide will help you deploy your FastAPI application to AWS ECS/Fargate without modifying your original code.

## Prerequisites

1. **Docker installed** on your local machine
2. **AWS CLI configured** with appropriate permissions
3. **Your original FastAPI code** (`main.py`, `crewai_agents.py`, etc.)

## Step-by-Step Deployment

### Step 1: Setup IAM Roles (One-time setup)

```bash
cd backend
setup-iam-roles.bat
```

This creates the necessary IAM roles for ECS to run your containers.

### Step 2: Build and Deploy

```bash
cd backend
deploy-ecs.bat
```

This script will:
1. Build your Docker image
2. Push it to Amazon ECR
3. Create ECS cluster and service
4. Deploy your application

### Step 3: Create Load Balancer (One-time setup)

After deployment, you'll need to create an Application Load Balancer:

1. Go to AWS Console → EC2 → Load Balancers
2. Create Application Load Balancer
3. Configure target group to point to your ECS service
4. Note the ALB DNS name for your frontend

### Step 4: Update Frontend

Once deployed, update your frontend to use the new ALB URL instead of the Lambda URL.

## What This Gives You

✅ **Zero code modifications** - Your `main.py` and `crewai_agents.py` run exactly as developed
✅ **No size limitations** - Unlike Lambda's 250MB limit
✅ **Better performance** - No cold starts
✅ **Full database support** - Direct PostgreSQL connections
✅ **All dependencies work** - CrewAI, LangChain, etc.
✅ **WebSocket support** - If needed later
✅ **Auto-scaling** - Based on CPU/memory usage

## Architecture

```
Internet → ALB → ECS/Fargate → Your FastAPI App → RDS PostgreSQL
```

## Cost Optimization

- **Fargate Spot** for non-production workloads
- **Auto-scaling** to scale down during low usage
- **Reserved capacity** for production workloads

## Monitoring

- **CloudWatch Logs** for application logs
- **ECS Service Events** for deployment status
- **ALB Access Logs** for HTTP requests

## Troubleshooting

1. **Check ECS Service Events** in AWS Console
2. **View CloudWatch Logs** for application errors
3. **Verify Security Groups** allow traffic on port 8000
4. **Check Task Definition** for environment variables

## Benefits Over Lambda

| Feature | Lambda | ECS/Fargate |
|---------|--------|-------------|
| **Code Changes** | Required | None |
| **Size Limit** | 250MB | None |
| **Cold Starts** | Yes | No |
| **Database Connections** | Limited | Full |
| **Long-running Processes** | 15min max | Unlimited |
| **WebSocket Support** | Limited | Full |

## Next Steps

1. Deploy using the scripts above
2. Create Application Load Balancer
3. Update frontend to use new URL
4. Test all functionality
5. Set up monitoring and alerts

Your FastAPI application will run exactly as it does locally, with all features working perfectly! 