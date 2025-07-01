# DigitalOcean Deployment Guide

## Quick Deploy Steps

### 1. Prerequisites
- DigitalOcean account with App Platform access
- GitHub repository connected to DigitalOcean
- Required environment variables ready

### 2. Deploy Using App Spec (Recommended)

#### Option A: Upload app.yaml
1. Go to DigitalOcean App Platform Dashboard
2. Click "Create App"
3. Select "Upload App Spec"
4. Upload `.do/app.yaml` from your repo
5. Update GitHub repo URL in the spec
6. Configure environment variables (see below)

#### Option B: Manual Configuration
1. Create new app on DigitalOcean
2. Connect your GitHub repository
3. Select branch: `main`
4. Configure build settings:
   - **Build Command**: `npm install && cd packages/database && npm install && npm run build && cd ../../apps/api && npm install && npm run build`
   - **Run Command**: `cd apps/api && npm start`
   - **Environment**: Node.js
   - **HTTP Port**: 8000

### 3. Required Environment Variables

Set these in DigitalOcean App Platform → Settings → Environment Variables:

#### Database & Redis (Auto-configured if using DO services)
```
DATABASE_URL=${db.DATABASE_URL}
REDIS_URL=${redis.REDIS_URL}
```

#### Application Settings
```
NODE_ENV=production
PORT=8000
```

#### JWT Secrets (Generate strong secrets)
```
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters
```

#### Email Configuration (SMTP - Gmail example)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=your-email@gmail.com
```

#### Cloudinary (File Upload)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Razorpay (Payment Gateway)
```
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

#### Optional Settings
```
CORS_ORIGIN=https://your-frontend-domain.com
ADMIN_EMAIL=admin@nakksha.com
LOG_LEVEL=info
```

### 4. Database Setup

#### Using DigitalOcean Managed Database (Recommended)
1. In App Platform, add PostgreSQL database service
2. The `DATABASE_URL` will be auto-configured
3. After deployment, run database migrations:
   ```bash
   # Connect to your app console and run:
   cd packages/database && npx prisma migrate deploy
   ```

#### Using External Database
1. Set `DATABASE_URL` manually to your PostgreSQL connection string
2. Ensure database is accessible from DigitalOcean

### 5. Deploy & Monitor

1. Click "Create Resources" or "Deploy"
2. Monitor build logs for any issues
3. Once deployed, check application logs
4. Test your API endpoints

### 6. Post-Deployment

#### Database Migration
```bash
# In DigitalOcean console or via GitHub Actions
cd packages/database
npx prisma migrate deploy
npx prisma generate
```

#### Health Check
Your API will be available at: `https://your-app-name.ondigitalocean.app`

Test endpoints:
- `GET /health` - Health check
- `GET /api/v1/health` - API health check

### 7. Troubleshooting

#### Common Issues:

**Build Fails - Module Resolution**
- Ensure `packages/database` is built before `apps/api`
- Check build command includes both packages

**Database Connection Issues**
- Verify `DATABASE_URL` format
- Check database is accessible
- Ensure migrations are applied

**Environment Variables Missing**
- Verify all required env vars are set
- Check secrets are properly configured

#### Debug Commands:
```bash
# Check environment
echo $NODE_ENV

# Test database connection
cd packages/database && npx prisma db pull

# Check build output
ls -la apps/api/dist/
```

### 8. Scaling Considerations

- Start with `basic-xxs` instance
- Monitor memory/CPU usage
- Scale instance size as needed
- Consider multiple instances for high traffic

### 9. Security Checklist

- [ ] Strong JWT secrets (32+ characters)
- [ ] Database credentials secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Environment variables as secrets

## Alternative: Deploy via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: digitalocean/app_action@v1.1.5
        with:
          app_name: nakksha-consulting-api
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

## Monitoring & Maintenance

- Monitor app metrics in DO dashboard
- Set up alerts for high CPU/memory usage
- Regular database backups
- Monitor API response times
- Check error logs regularly