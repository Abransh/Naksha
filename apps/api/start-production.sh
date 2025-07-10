#!/bin/bash

# Nakksha API Production Startup Script
# This script validates environment variables and starts the API server

set -e  # Exit on any error

echo "🚀 Starting Nakksha API Server..."
echo "📅 $(date)"
echo "🌍 Environment: ${NODE_ENV:-production}"

# Function to check if environment variable exists
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo "❌ ERROR: Required environment variable '$var_name' is not set"
        echo "💡 Please set this variable in your DigitalOcean app settings or .env file"
        return 1
    else
        echo "✅ $var_name is set"
        return 0
    fi
}

# Function to validate optional environment variable
check_optional_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo "⚠️  WARN: Optional environment variable '$var_name' is not set"
    else
        echo "✅ $var_name is set"
    fi
}

echo ""
echo "🔍 Validating environment variables..."

# Check required environment variables
VALIDATION_FAILED=false

check_env_var "DATABASE_URL" || VALIDATION_FAILED=true
check_env_var "JWT_SECRET" || VALIDATION_FAILED=true
check_env_var "JWT_REFRESH_SECRET" || VALIDATION_FAILED=true
check_env_var "REDIS_URL" || VALIDATION_FAILED=true
check_env_var "RESEND_API_KEY" || VALIDATION_FAILED=true

# Check optional but recommended variables
echo ""
echo "🔍 Checking optional variables..."
check_optional_env_var "CLOUDINARY_CLOUD_NAME"
check_optional_env_var "CLOUDINARY_API_KEY"
check_optional_env_var "CLOUDINARY_API_SECRET"
check_optional_env_var "RAZORPAY_KEY_ID"
check_optional_env_var "RAZORPAY_KEY_SECRET"
check_optional_env_var "FRONTEND_URL"
check_optional_env_var "PORT"

# If validation failed, exit
if [ "$VALIDATION_FAILED" = true ]; then
    echo ""
    echo "❌ Environment validation failed!"
    echo ""
    echo "📋 Required environment variables:"
    echo "   - DATABASE_URL: PostgreSQL connection string"
    echo "   - JWT_SECRET: Secret for JWT token signing"
    echo "   - JWT_REFRESH_SECRET: Secret for refresh token signing"
    echo "   - REDIS_URL: Redis connection string"
    echo "   - RESEND_API_KEY: API key for email sending"
    echo ""
    echo "🔧 For DigitalOcean deployment:"
    echo "   1. Go to your app settings"
    echo "   2. Navigate to 'Environment Variables'"
    echo "   3. Add the required variables"
    echo "   4. Redeploy your application"
    echo ""
    exit 1
fi

echo ""
echo "✅ Environment validation passed!"

# Validate DATABASE_URL format
if [[ "$DATABASE_URL" == *"localhost"* ]] && [[ "$NODE_ENV" == "production" ]]; then
    echo "⚠️  WARNING: DATABASE_URL contains 'localhost' but NODE_ENV is 'production'"
    echo "    Make sure you're using the correct database URL for production"
fi

# Set default PORT if not specified
export PORT=${PORT:-8000}

echo ""
echo "🔄 Starting application..."
echo "📡 Server will start on port: $PORT"

# Start the application
exec node dist/index.js