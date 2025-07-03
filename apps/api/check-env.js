#!/usr/bin/env node

/**
 * Environment Variable Checker for Naksha API
 * 
 * This script validates all required environment variables
 * and provides helpful debugging information for production deployment.
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET', 
  'JWT_REFRESH_SECRET'
];

const optionalEnvVars = [
  'REDIS_URL',
  'EMAIL_HOST',
  'EMAIL_USER', 
  'EMAIL_PASS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'NODE_ENV',
  'PORT'
];

console.log('🔍 Naksha API Environment Check\n');

// Check required variables
let missingRequired = [];
console.log('✅ Required Environment Variables:');
requiredEnvVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET') || key.includes('PASSWORD') ? 
      '*'.repeat(8) : 
      value.substring(0, 20) + (value.length > 20 ? '...' : '');
    console.log(`   ${key}: ${maskedValue}`);
  } else {
    console.log(`   ❌ ${key}: MISSING`);
    missingRequired.push(key);
  }
});

console.log('\n📋 Optional Environment Variables:');
optionalEnvVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    const maskedValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY') ? 
      '*'.repeat(8) : 
      value.substring(0, 20) + (value.length > 20 ? '...' : '');
    console.log(`   ${key}: ${maskedValue}`);
  } else {
    console.log(`   ⚠️  ${key}: Not configured`);
  }
});

// Redis-specific checks
console.log('\n🔄 Redis Configuration:');
if (process.env.REDIS_URL) {
  const redisUrl = process.env.REDIS_URL;
  console.log(`   URL: ${redisUrl.substring(0, 20)}...`);
  
  if (redisUrl.startsWith('rediss://')) {
    console.log('   ✅ TLS/SSL enabled (rediss://)');
  } else if (redisUrl.startsWith('redis://')) {
    console.log('   ⚠️  Plain connection (redis://) - consider TLS for production');
  }
} else {
  console.log('   ❌ REDIS_URL not configured - caching and session features disabled');
}

// Database-specific checks
console.log('\n🗄️ Database Configuration:');
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.startsWith('postgresql://')) {
    console.log('   ✅ PostgreSQL connection configured');
  } else if (dbUrl.startsWith('mysql://')) {
    console.log('   ⚠️  MySQL detected - PostgreSQL recommended');
  }
  
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.log('   ⚠️  Local database detected - ensure this is intentional for production');
  }
} else {
  console.log('   ❌ DATABASE_URL not configured');
}

// Security checks
console.log('\n🔒 Security Configuration:');
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
  console.log('   ✅ JWT_SECRET has adequate length');
} else if (process.env.JWT_SECRET) {
  console.log('   ⚠️  JWT_SECRET should be at least 32 characters long');
} else {
  console.log('   ❌ JWT_SECRET not configured');
}

// Environment mode
console.log('\n🌍 Environment Mode:');
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`   NODE_ENV: ${nodeEnv}`);

if (nodeEnv === 'production') {
  console.log('   ✅ Production mode enabled');
} else {
  console.log('   ⚠️  Not in production mode - some features may behave differently');
}

// Summary
console.log('\n📊 Summary:');
if (missingRequired.length > 0) {
  console.log(`   ❌ ${missingRequired.length} required environment variables missing:`);
  missingRequired.forEach(key => console.log(`      - ${key}`));
  console.log('\n   🚨 Application will fail to start!');
  process.exit(1);
} else {
  console.log('   ✅ All required environment variables are configured');
  
  const missingOptional = optionalEnvVars.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.log(`   ⚠️  ${missingOptional.length} optional features not configured:`);
    missingOptional.forEach(key => console.log(`      - ${key}`));
  }
  
  console.log('\n   🎉 Ready for deployment!');
}