# Naksha API - Production Deployment Guide

## Redis Connection Issues - Fixed! ✅

### Problem
The Redis connection was experiencing `SocketClosedUnexpectedlyError` in production on DigitalOcean.

### Solution Applied
Enhanced Redis configuration with production-optimized settings:

1. **Increased Connection Timeouts**: 30-second timeout for DigitalOcean's network
2. **Enhanced Retry Logic**: Up to 10 retries with exponential backoff
3. **Production Socket Options**: IPv4 forcing, optimized keep-alive settings
4. **Graceful Degradation**: App continues without Redis if connection fails
5. **TLS Support**: Automatic TLS detection for `rediss://` URLs

### Key Changes Made

- **File**: `src/config/redis.ts`
- **Connection Timeout**: Increased to 30 seconds
- **Max Retries**: Increased to 10 attempts
- **Graceful Fallback**: App won't crash if Redis fails in production
- **Type Safety**: Fixed all TypeScript null pointer issues

## Quick Deployment Commands

```bash
# Check environment configuration
npm run check-env

# Build for production
npm run build

# Start in production mode
npm start

# Or use the comprehensive production script
npm run start:production
```

## Environment Variables

### Required Variables
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-minimum-32-characters"
NODE_ENV="production"
```

### Optional but Recommended
```bash
# Redis (for caching and session management)
REDIS_URL="redis://localhost:6379"
# Or for TLS: REDIS_URL="rediss://username:password@host:port"

# Email service
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# File uploads
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Payment processing
RAZORPAY_KEY_ID="your-razorpay-key"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
```

## Redis Configuration

### DigitalOcean Redis
The application is now optimized for DigitalOcean's managed Redis:

```bash
# For managed Redis with TLS
REDIS_URL="rediss://username:password@host:port"

# For basic Redis
REDIS_URL="redis://username:password@host:port"
```

### Redis Features (Optional)
When Redis is available:
- ✅ Session caching for faster authentication
- ✅ Rate limiting for API endpoints
- ✅ Real-time data caching
- ✅ Background job queuing

When Redis is unavailable:
- ⚠️ Sessions fall back to database lookups
- ⚠️ Rate limiting is disabled (fail-open)
- ⚠️ No caching (slight performance impact)
- ✅ Core functionality remains unaffected

## Deployment Checklist

### Pre-Deployment
- [ ] Run `npm run check-env` to validate configuration
- [ ] Run `npm run build` to ensure compilation success
- [ ] Run `npm run lint` to check code quality
- [ ] Verify database connectivity
- [ ] Test Redis connection (optional)

### Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Run database migrations if needed
- [ ] Start the application with `npm start`
- [ ] Verify health endpoint: `GET /health`

### Post-Deployment
- [ ] Check application logs for Redis warnings
- [ ] Test authentication endpoints
- [ ] Verify API functionality
- [ ] Monitor performance metrics

## Troubleshooting

### Redis Connection Issues
1. **Check Redis URL format**:
   ```bash
   # Valid formats:
   redis://localhost:6379
   redis://username:password@host:port
   rediss://username:password@host:port (TLS)
   ```

2. **Test Redis connectivity**:
   ```bash
   # From your server
   redis-cli -u $REDIS_URL ping
   ```

3. **Check application logs**:
   - Look for Redis connection attempts
   - Warning messages indicate Redis is optional
   - Error messages show connection details

### Application Won't Start
1. Run environment check: `npm run check-env`
2. Check required variables are set
3. Verify database connectivity
4. Check port availability

### Performance Issues
1. Enable Redis for caching if available
2. Check database connection pooling
3. Monitor memory usage
4. Review log files for errors

## Production Optimizations Applied

### Redis Configuration
- **Connection pooling**: Optimized for production load
- **Retry strategy**: Exponential backoff with max 10 attempts
- **Error handling**: Graceful degradation without crashing
- **TLS support**: Automatic detection and configuration

### Application Features
- **Graceful shutdown**: Proper cleanup on termination
- **Health monitoring**: `/health` endpoint for load balancers
- **Error handling**: Comprehensive error boundaries
- **Security**: Helmet, CORS, rate limiting

### Database
- **Connection pooling**: Prisma ORM optimizations
- **Query optimization**: Efficient database queries
- **Migration support**: Database schema management

## Support

For Redis connection issues:
1. Check DigitalOcean Redis configuration
2. Verify network connectivity
3. Review application logs
4. Contact platform support if needed

The application will run successfully even without Redis - it's an optimization, not a requirement.