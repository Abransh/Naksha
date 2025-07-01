#!/bin/bash
set -e

echo "🔧 Installing root dependencies..."
npm install

echo "📦 Installing database dependencies..."
cd packages/database
npm install

echo "🔄 Generating Prisma client..."
npm run build

echo "🏗️ Building database package..."
npx tsc
cd ../..

echo "🚀 Building API..."
cd apps/api
npm install
npm run build
cd ../..

echo "✅ Build completed successfully!"