# Namecheap DNS Configuration for parenzing.com

## Current Setup

- **Domain**: `parenzing.com` (managed by Namecheap)
- **SSL Certificate**: ✅ Valid and issued for `parenzing.com`
- **ALB**: `parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com`

## Step 1: Get Your ALB DNS Name

1. Go to **AWS EC2 Console** → **Load Balancers**
2. Select your ALB: `parenting-app-alb-1579687963`
3. Copy the **DNS name**: `parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com`

## Step 2: Configure Namecheap DNS

### Log into Namecheap:
1. Go to [Namecheap.com](https://namecheap.com) and log in
2. Go to **Domain List**
3. Click **Manage** next to `parenzing.com`
4. Go to **Advanced DNS**

### Add DNS Records:

#### Option A: CNAME Record (Recommended)
- **Type**: CNAME Record
- **Host**: `@` (or leave empty for root domain)
- **Value**: `parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com`
- **TTL**: Automatic

#### Option B: A Record (if CNAME doesn't work)
- **Type**: A Record
- **Host**: `@` (or leave empty)
- **Value**: [Get the IP address from AWS ALB]
- **TTL**: Automatic

## Step 3: Configure ALB Listener

1. **Go to AWS EC2 Console** → **Load Balancers**
2. **Select your ALB**: `parenting-app-alb-1579687963`
3. **Go to Listeners tab**
4. **Edit the HTTPS listener** (port 443):
   - **Default action**: Forward to your target group
   - **SSL Certificate**: Select your certificate:
     `arn:aws:acm:ap-southeast-2:509624333775:certificate/6cfcc913-58ce-4b51-9e8e-04474881856f`

## Step 4: Test the Setup

After DNS propagation (can take up to 24 hours, but usually much faster):

1. **Test DNS resolution**:
   ```bash
   nslookup parenzing.com
   ```

2. **Test HTTPS connection**:
   ```bash
   curl -I https://parenzing.com/health
   ```

3. **Test from your app**:
   - Go to `https://master.dcmcchu8q16tm.amplifyapp.com/login`
   - Try the "Continue with Google" button

## Troubleshooting

### If DNS doesn't resolve:
1. Check that the CNAME record is correct in Namecheap
2. Wait for DNS propagation (can take 15 minutes to 24 hours)
3. Use `nslookup parenzing.com` to check resolution

### If HTTPS doesn't work:
1. Make sure the SSL certificate is attached to the ALB listener
2. Check that the certificate is for the correct domain
3. Verify the ALB security group allows HTTPS traffic (port 443)

### If you get CORS errors:
1. The CORS configuration has been updated to include `https://parenzing.com`
2. Make sure your backend is running and accessible

## Expected Result

After setup:
- `https://parenzing.com/health` should return: `{"status":"healthy","message":"Service is running"}`
- Your app should work with proper HTTPS and valid SSL certificate
- No more certificate errors in the browser 