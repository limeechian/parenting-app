# Custom Domain Setup Guide

## Current Issue

You're right that using HTTP is not correct! You've purchased a domain and created an SSL certificate in AWS Certificate Manager, but your ALB is still using the default AWS domain name which has an invalid SSL certificate.

## Solution: Configure Your Custom Domain

### Step 1: Check Your Domain and Certificate

1. **Domain Name**: What domain did you purchase? (e.g., `yourdomain.com`)
2. **SSL Certificate**: Check AWS Certificate Manager to see your certificate details

### Step 2: Configure ALB with Custom Domain

You need to:
1. **Update your ALB** to use your custom domain
2. **Attach the SSL certificate** to the ALB
3. **Update DNS records** to point to your ALB

### Step 3: Update API Configuration

Once your custom domain is configured, update the API URL:

```typescript
// In frontend/src/services/api.ts
const API_BASE_URL = 'https://yourdomain.com'; // Your custom domain
```

### Step 4: Update CORS Configuration

Update the backend CORS to include your custom domain:

```python
# In backend/main.py
allow_origins=[
    "http://localhost:3000",
    "https://master.dcmcchu8q16tm.amplifyapp.com",
    "https://dcmcchu8q16tm.amplifyapp.com",
    "https://yourdomain.com",  # Your custom domain
]
```

## AWS Configuration Steps

### 1. Configure ALB Listener

1. Go to **EC2 Console** → **Load Balancers**
2. Select your ALB: `parenting-app-alb-1579687963`
3. Go to **Listeners** tab
4. Edit the HTTPS listener (port 443)
5. **Change the default action** to forward to your target group
6. **Attach your SSL certificate** from Certificate Manager

### 2. Update DNS Records

1. Go to **Route 53** (if using AWS DNS) or your domain registrar
2. Create an **A record** pointing to your ALB:
   - **Name**: `api.yourdomain.com` (or just `yourdomain.com`)
   - **Type**: A - Routes traffic to an IPv4 address
   - **Alias**: Yes
   - **Route traffic to**: Application and Classic Load Balancer
   - **Region**: ap-southeast-2
   - **Load balancer**: your ALB

### 3. Update Amplify Domain (Optional)

You can also configure a custom domain for your Amplify app:
1. Go to **Amplify Console** → Your App → **Domain management**
2. Add your custom domain
3. Configure subdomain (e.g., `app.yourdomain.com`)

## Current Status

- ❌ Using HTTP (temporary fix)
- ❌ ALB using default AWS domain with invalid SSL
- ✅ SSL certificate created in Certificate Manager
- ✅ Custom domain purchased
- ⚠️ Need to configure ALB with custom domain

## Next Steps

1. **Tell me your domain name** so I can help you configure it properly
2. **Configure ALB listener** with your SSL certificate
3. **Update DNS records** to point to your ALB
4. **Update API configuration** to use your custom domain
5. **Test the setup** with proper HTTPS

## Questions for You

1. What domain name did you purchase?
2. Is your domain managed by Route 53 or another registrar?
3. Do you want to use a subdomain for the API (e.g., `api.yourdomain.com`) or the root domain?

Once you provide this information, I can give you the exact configuration steps for your specific setup. 