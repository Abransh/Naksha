#!/bin/bash

# Production startup script for Naksha API
# This script handles the complete startup process for production deployment

set -e  # Exit on any error

echo "🚀 Starting Naksha API in Production Mode..."

# Set production environment
export NODE_ENV=production

# Check required environment variables
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ DATABASE_URL environment variable is required"
    exit 1
fi

if [[ -z "$JWT_SECRET" ]]; then
    echo "❌ JWT_SECRET environment variable is required" 
    exit 1
fi

# Optional Redis warning
if [[ -z "$REDIS_URL" ]]; then
    echo "⚠️ REDIS_URL not configured - some features will be disabled"
fi

echo "🔧 Building application..."
npm run build

echo "🗄️ Setting up database..."
cd ../../packages/database
npm run db:generate

# Optional: Run migrations if needed
# npm run db:migrate

cd ../../apps/api

echo "✅ Starting application server..."
node dist/index.js