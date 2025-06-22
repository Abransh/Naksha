# 🚀 Nakksha Platform Environment Setup Guide

## 1. Database Setup (Neon PostgreSQL)

### Step 1: Create Neon Database
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project named "nakksha-platform"
3. Copy the connection string (looks like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/nakksha?sslmode=require`)

### Step 2: Create Database Branches
- **main**: Production database
- **dev**: Development database  
- **staging**: Staging database

## 2. Redis Setup (Upstash)

### Step 1: Create Upstash Redis
1. Go to [upstash.com](https://upstash.com) and sign up
2. Create a new Redis database named "nakksha-cache"
3. Copy the Redis URL (looks like: `redis://default:xxx@xxx.upstash.io:6379`)

## 3. Email Service Setup (Resend)

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com) and sign up
2. Create API key with domain sending permissions
3. Add your domain (or use resend.dev for testing)

## 4. File Storage Setup (Cloudinary)

### Step 1: Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com) and sign up
2. Copy Cloud Name, API Key, and API Secret from dashboard

## 5. Payment Setup (Razorpay)

### Step 1: Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com) and sign up
2. Get Test/Live API keys from dashboard

## 6. Environment Variables Setup

### Required Environment Files:
- `/apps/api/.env` - API server environment
- `/apps/consultant-dashboard/.env.local` - Frontend environment  
- `/packages/database/.env` - Database environment
- `/.env` - Root environment (optional)

## 7. JWT Secrets Generation

Use these commands to generate secure secrets:

```bash
# Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

## 8. Next Steps After Environment Setup

1. **Database Migration**: `npm run db:push`
2. **Start Development**: `npm run dev`
3. **Create Admin User**: Use the seed script
4. **Test Authentication**: Test consultant signup/admin approval flow

## 9. Production Deployment Recommendations

- **API**: Railway or Render
- **Frontend**: Vercel  
- **Database**: Neon (already serverless)
- **Cache**: Upstash (already serverless)

## 10. Monitoring & Analytics

- **Error Tracking**: Sentry
- **Analytics**: PostHog or Mixpanel
- **Uptime**: Uptime Robot

## Security Checklist

- [ ] Strong JWT secrets generated
- [ ] Database SSL enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Secure cookie settings
- [ ] Environment variables secured