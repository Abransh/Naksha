#!/bin/bash
set -e

echo "🔧 Installing root dependencies..."
npm install

echo "📦 Building database package..."
cd packages/database
npm install
npm run db:generate
npx tsc
cd ../..

echo "🚀 Building API..."
cd apps/api
npm install
npm run build
cd ../..

echo "✅ Build completed successfully!"