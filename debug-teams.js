#!/usr/bin/env node

/**
 * Teams Integration Debug Script
 * 
 * This script helps debug Teams integration issues by:
 * 1. Testing token validation
 * 2. Checking system time vs token expiration
 * 3. Verifying Microsoft Graph API connectivity
 * 4. Testing the complete flow
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';
const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

// Helper function to decode JWT token
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    console.error('❌ Failed to decode JWT:', error.message);
    return null;
  }
}

// Helper function to check token expiration
function checkTokenExpiration(token) {
  const payload = decodeJWT(token);
  if (!payload) return null;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  
  return {
    currentTime,
    expirationTime,
    isExpired: currentTime > expirationTime,
    expiresIn: expirationTime - currentTime,
    systemDate: new Date().toISOString(),
    tokenExpDate: new Date(expirationTime * 1000).toISOString(),
    timeDifference: currentTime - expirationTime
  };
}

// Test system time
async function testSystemTime() {
  console.log('\n🕐 SYSTEM TIME CHECK');
  console.log('===================');
  
  const systemTime = new Date();
  const utcTime = new Date().toISOString();
  const unixTime = Math.floor(Date.now() / 1000);
  
  console.log(`System Time: ${systemTime}`);
  console.log(`UTC Time: ${utcTime}`);
  console.log(`Unix Timestamp: ${unixTime}`);
  
  // Check if system time is reasonable (should be around January 2025)
  const expectedYear = 2025;
  const actualYear = systemTime.getFullYear();
  
  if (actualYear !== expectedYear) {
    console.log(`⚠️  WARNING: System year is ${actualYear}, expected ${expectedYear}`);
    console.log(`   This could cause token expiration issues!`);
  } else {
    console.log(`✅ System time appears correct`);
  }
}

// Test Microsoft Graph API connectivity
async function testGraphAPI() {
  console.log('\n🌐 MICROSOFT GRAPH API CONNECTIVITY');
  console.log('==================================');
  
  try {
    const response = await axios.get(`${MICROSOFT_GRAPH_URL}/$metadata`, {
      timeout: 10000
    });
    
    console.log(`✅ Microsoft Graph API accessible`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: ${Object.keys(response.headers).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Microsoft Graph API error:`, {
      status: error.response?.status,
      message: error.message,
      timeout: error.code === 'ECONNABORTED'
    });
    return false;
  }
}

// Test token validation with a sample token
async function testTokenValidation(token) {
  console.log('\n🔍 TOKEN VALIDATION TEST');
  console.log('======================');
  
  if (!token) {
    console.log('❌ No token provided for testing');
    return false;
  }
  
  // First, analyze the token locally
  const tokenInfo = checkTokenExpiration(token);
  if (tokenInfo) {
    console.log('📊 Token Analysis:');
    console.log(`   Current Time: ${tokenInfo.currentTime} (${tokenInfo.systemDate})`);
    console.log(`   Token Expires: ${tokenInfo.expirationTime} (${tokenInfo.tokenExpDate})`);
    console.log(`   Is Expired: ${tokenInfo.isExpired}`);
    console.log(`   Expires In: ${tokenInfo.expiresIn} seconds`);
    console.log(`   Time Difference: ${tokenInfo.timeDifference} seconds`);
    
    if (tokenInfo.isExpired) {
      console.log(`⚠️  Token is expired by ${Math.abs(tokenInfo.timeDifference)} seconds`);
    } else {
      console.log(`✅ Token is valid for ${tokenInfo.expiresIn} more seconds`);
    }
  }
  
  // Test token against Microsoft Graph API
  try {
    const response = await axios.get(`${MICROSOFT_GRAPH_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    console.log(`✅ Token validation successful:`, {
      status: response.status,
      userEmail: response.data?.mail || response.data?.userPrincipalName,
      userId: response.data?.id,
      displayName: response.data?.displayName
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Token validation failed:`, {
      status: error.response?.status,
      error: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code
    });
    return false;
  }
}

// Test session creation API
async function testSessionCreation(authToken) {
  console.log('\n🚀 SESSION CREATION TEST');
  console.log('=======================');
  
  if (!authToken) {
    console.log('❌ No auth token provided for API testing');
    return false;
  }
  
  try {
    // Test session creation with Teams platform
    const sessionData = {
      clientId: 'test-client-id', // This would need to be a real client ID
      title: 'Test Teams Meeting',
      sessionType: 'CONSULTATION',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '14:00:00',
      durationMinutes: 60,
      amount: 1000,
      platform: 'TEAMS',
      paymentMethod: 'offline',
      notes: 'Debug test session'
    };
    
    const response = await axios.post(`${API_BASE_URL}/sessions`, sessionData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log(`✅ Session created successfully:`, {
      sessionId: response.data.data?.id,
      meetingLink: response.data.data?.meetingLink,
      meetingId: response.data.data?.meetingId,
      platform: response.data.data?.platform
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Session creation failed:`, {
      status: error.response?.status,
      error: error.response?.data?.error || error.message,
      details: error.response?.data
    });
    return false;
  }
}

// Main debug function
async function runDebugScript() {
  console.log('🔧 TEAMS INTEGRATION DEBUG SCRIPT');
  console.log('=================================');
  
  // Test 1: System time
  await testSystemTime();
  
  // Test 2: Microsoft Graph API connectivity
  const graphAccessible = await testGraphAPI();
  
  // Test 3: Token validation (if token provided)
  const teamsToken = process.env.TEAMS_ACCESS_TOKEN;
  if (teamsToken) {
    const tokenValid = await testTokenValidation(teamsToken);
    console.log(`\n📊 Token validation result: ${tokenValid ? 'VALID' : 'INVALID'}`);
  } else {
    console.log('\n⚠️  No TEAMS_ACCESS_TOKEN environment variable found');
    console.log('   To test token validation, set TEAMS_ACCESS_TOKEN=your_token');
  }
  
  // Test 4: Session creation (if auth token provided)
  const authToken = process.env.AUTH_TOKEN;
  if (authToken) {
    const sessionCreated = await testSessionCreation(authToken);
    console.log(`\n📊 Session creation result: ${sessionCreated ? 'SUCCESS' : 'FAILED'}`);
  } else {
    console.log('\n⚠️  No AUTH_TOKEN environment variable found');
    console.log('   To test session creation, set AUTH_TOKEN=your_jwt_token');
  }
  
  console.log('\n📋 SUMMARY');
  console.log('=========');
  console.log(`✅ System time check: Complete`);
  console.log(`${graphAccessible ? '✅' : '❌'} Microsoft Graph API: ${graphAccessible ? 'Accessible' : 'Not accessible'}`);
  console.log(`${teamsToken ? '✅' : '⚠️'} Teams token test: ${teamsToken ? 'Tested' : 'Skipped (no token)'}`);
  console.log(`${authToken ? '✅' : '⚠️'} Session creation test: ${authToken ? 'Tested' : 'Skipped (no auth token)'}`);
  
  console.log('\n🎯 NEXT STEPS');
  console.log('============');
  
  if (!graphAccessible) {
    console.log('• Check internet connectivity and firewall settings');
    console.log('• Verify Microsoft Graph API is not blocked');
  }
  
  if (teamsToken) {
    console.log('• Review token validation logs above');
    console.log('• If token is expired, try refreshing it via /api/v1/teams/refresh-token');
  } else {
    console.log('• To test with real token: TEAMS_ACCESS_TOKEN=your_token node debug-teams.js');
  }
  
  if (authToken) {
    console.log('• Review session creation logs above');
    console.log('• Check API logs for detailed error information');
  } else {
    console.log('• To test session creation: AUTH_TOKEN=your_jwt_token node debug-teams.js');
  }
  
  console.log('\n• Check Digital Ocean server logs for more details');
  console.log('• Verify system time is correct (should be around January 2025)');
  console.log('• Test the complete flow: OAuth → Token → Session Creation');
}

// Run the debug script
if (require.main === module) {
  runDebugScript().catch(console.error);
}

module.exports = {
  testSystemTime,
  testGraphAPI,
  testTokenValidation,
  testSessionCreation,
  checkTokenExpiration,
  decodeJWT
};