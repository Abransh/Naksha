# DigitalOcean Deployment Fix Guide

## 🚨 Problem Solved: DATABASE_URL Environment Variable Error

The error you encountered:
```
PrismaClientInitializationError: error: Environment variable not found: DATABASE_URL
```

Has been fixed with comprehensive environment variable validation and better error handling.

## ✅ What We Fixed

### 1. **Enhanced Database Client Validation**
- Added environment variable validation in `packages/database/src/client.ts`
- Clear error messages when `DATABASE_URL` is missing
- Helpful instructions for both local and DigitalOcean deployment

### 2. **Improved Startup Script**
- Updated `apps/api/start-production.sh` with comprehensive validation
- Checks all required environment variables before starting
- Provides clear instructions for fixing missing variables

### 3. **Better Error Messages**
- Descriptive error messages that explain exactly what's missing
- Specific instructions for DigitalOcean deployment
- Validation of optional but recommended variables

## 🔧 Required Environment Variables

For your DigitalOcean deployment, you need to set these environment variables:

### **Required (Critical)**
```bash
DATABASE_URL="postgresql://user:pass@host:port/database"
JWT_SECRET="your-super-secret-jwt-key-32-chars-min"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-32-chars-min"
REDIS_URL="redis://user:pass@host:port"
RESEND_API_KEY="re_your_resend_api_key"
```

### **Optional but Recommended**
```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
FRONTEND_URL="https://your-frontend-domain.com"
PORT="8000"
NODE_ENV="production"
```

## 🚀 DigitalOcean Deployment Steps

### Step 1: Set Environment Variables in DigitalOcean

1. Go to your DigitalOcean App Platform dashboard
2. Select your app
3. Go to **Settings** → **App-Level Environment Variables**
4. Add each required variable:

```
DATABASE_URL = your_postgresql_connection_string
JWT_SECRET = generate_with_openssl_rand_base64_32
JWT_REFRESH_SECRET = generate_with_openssl_rand_base64_32
REDIS_URL = your_redis_connection_string
RESEND_API_KEY = your_resend_api_key
NODE_ENV = production
PORT = 8000
```

### Step 2: Update Your App Spec

Make sure your `app.yaml` or app configuration includes:

```yaml
name: nakksha-api
services:
- name: api
  source_dir: apps/api
  build_command: npm run build
  run_command: ./start-production.sh
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  health_check:
    http_path: /health
```

### Step 3: Generate JWT Secrets

Generate secure JWT secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET  
openssl rand -base64 32
```

### Step 4: Get Database and Redis URLs

**From DigitalOcean Managed Databases:**

1. Go to **Databases** in your DigitalOcean dashboard
2. Select your PostgreSQL database
3. Copy the connection string from **Connection Details**
4. Do the same for Redis

**Connection string format:**
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
REDIS_URL=rediss://user:password@host:port
```

## 🔍 Troubleshooting

### If you still get DATABASE_URL errors:

1. **Check the environment variable name**: Make sure it's exactly `DATABASE_URL` (case-sensitive)

2. **Verify the connection string format**:
   ```
   postgresql://username:password@hostname:port/database_name
   ```

3. **For DigitalOcean managed databases**, use the full connection string including SSL parameters

4. **Check app logs**: 
   ```bash
   doctl apps logs your-app-id
   ```

### If the startup script fails:

1. Make sure the script is executable:
   ```bash
   chmod +x start-production.sh
   ```

2. Check if all required environment variables are set in your DigitalOcean app settings

3. Verify your build process completes successfully

## 📋 Environment Variable Checklist

Before deployment, ensure you have:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - 32+ character secure random string
- [ ] `JWT_REFRESH_SECRET` - 32+ character secure random string  
- [ ] `REDIS_URL` - Redis connection string
- [ ] `RESEND_API_KEY` - For email functionality
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Set to 8000 or your preferred port

## 🎯 Next Steps

1. **Set all required environment variables** in your DigitalOcean app settings
2. **Redeploy your application** - the startup script will validate everything
3. **Check the logs** to see the validation results
4. **Test the /health endpoint** to verify the deployment

## 📞 Support

If you still encounter issues:

1. Check the startup script output in your deployment logs
2. Verify all environment variables are correctly set
3. Ensure your database and Redis services are running
4. Test the connection strings locally if possible

The enhanced error handling will now provide clear guidance on exactly what's missing and how to fix it.