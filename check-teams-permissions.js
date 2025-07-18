#!/usr/bin/env node

/**
 * Teams Permissions Checker
 * 
 * This script checks Microsoft Teams app permissions and OAuth scopes
 * to ensure the application is properly configured
 */

const axios = require('axios');

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

// Check token scopes
function checkTokenScopes(accessToken) {
  console.log('\n🔍 TOKEN SCOPE ANALYSIS');
  console.log('======================');
  
  const payload = decodeJWT(accessToken);
  if (!payload) {
    console.log('❌ Could not decode token');
    return false;
  }
  
  console.log('📊 Token Information:');
  console.log(`   Issuer: ${payload.iss}`);
  console.log(`   Audience: ${payload.aud}`);
  console.log(`   App ID: ${payload.appid}`);
  console.log(`   App Display Name: ${payload.app_displayname}`);
  console.log(`   Tenant ID: ${payload.tid}`);
  console.log(`   User ID: ${payload.oid}`);
  console.log(`   UPN: ${payload.upn}`);
  
  if (payload.scp) {
    const scopes = payload.scp.split(' ');
    console.log(`   Scopes: ${scopes.join(', ')}`);
    
    // Check for required scopes
    const requiredScopes = [
      'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
      'OnlineMeetings.ReadWrite',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'Calendars.ReadWrite'
    ];
    
    const hasOnlineMeetings = scopes.some(scope => 
      scope.includes('OnlineMeetings.ReadWrite')
    );
    const hasCalendars = scopes.some(scope => 
      scope.includes('Calendars.ReadWrite')
    );
    
    console.log(`   Has OnlineMeetings.ReadWrite: ${hasOnlineMeetings ? '✅' : '❌'}`);
    console.log(`   Has Calendars.ReadWrite: ${hasCalendars ? '✅' : '❌'}`);
    
    if (!hasOnlineMeetings) {
      console.log('⚠️ WARNING: OnlineMeetings.ReadWrite scope is missing!');
      console.log('   This is required for creating Teams meetings');
    }
    
    if (!hasCalendars) {
      console.log('⚠️ WARNING: Calendars.ReadWrite scope is missing!');
      console.log('   This is required for calendar integration');
    }
    
    return hasOnlineMeetings && hasCalendars;
  } else {
    console.log('❌ No scopes found in token');
    return false;
  }
}

// Test Microsoft Graph API permissions
async function testGraphPermissions(accessToken) {
  console.log('\n🌐 MICROSOFT GRAPH API PERMISSIONS TEST');
  console.log('======================================');
  
  const tests = [
    {
      name: 'User Profile Access',
      endpoint: 'https://graph.microsoft.com/v1.0/me',
      requiredFor: 'Basic user information'
    },
    {
      name: 'Calendar Access',
      endpoint: 'https://graph.microsoft.com/v1.0/me/calendar',
      requiredFor: 'Calendar integration'
    },
    {
      name: 'Online Meetings Endpoint',
      endpoint: 'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      requiredFor: 'Teams meeting creation',
      method: 'GET'
    }
  ];
  
  const results = {};
  
  for (const test of tests) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log(`   Endpoint: ${test.endpoint}`);
    console.log(`   Required for: ${test.requiredFor}`);
    
    try {
      const response = await axios.get(test.endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      });
      
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      results[test.name] = { success: true, status: response.status };
      
      // Log specific details for certain endpoints
      if (test.name === 'User Profile Access' && response.data) {
        console.log(`   👤 User: ${response.data.displayName} (${response.data.mail || response.data.userPrincipalName})`);
      }
      
      if (test.name === 'Online Meetings Endpoint' && response.data) {
        console.log(`   📅 Found ${response.data.value?.length || 0} existing meetings`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.status} ${error.response?.statusText}`);
      console.log(`   📝 Details: ${error.response?.data?.error?.message || error.message}`);
      
      results[test.name] = { 
        success: false, 
        status: error.response?.status, 
        error: error.response?.data?.error?.message || error.message 
      };
      
      // Specific error analysis
      if (error.response?.status === 403) {
        console.log(`   🔐 Permission Issue: Insufficient privileges for ${test.requiredFor}`);
      } else if (error.response?.status === 401) {
        console.log(`   🔑 Authentication Issue: Token may be invalid or expired`);
      } else if (error.response?.status === 404) {
        console.log(`   🎯 Endpoint Issue: ${test.endpoint} not found or not accessible`);
      }
    }
  }
  
  return results;
}

// Check tenant configuration
async function checkTenantConfig(accessToken) {
  console.log('\n🏢 TENANT CONFIGURATION CHECK');
  console.log('============================');
  
  try {
    // Get organization info
    const orgResponse = await axios.get('https://graph.microsoft.com/v1.0/organization', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 10000
    });
    
    if (orgResponse.data.value && orgResponse.data.value.length > 0) {
      const org = orgResponse.data.value[0];
      console.log(`   Organization: ${org.displayName}`);
      console.log(`   Tenant ID: ${org.id}`);
      console.log(`   Verified Domains: ${org.verifiedDomains?.map(d => d.name).join(', ')}`);
    }
    
    // Check if Teams is enabled
    console.log(`   ✅ Organization info accessible`);
    
    // Try to get Teams-specific configuration
    try {
      const teamsResponse = await axios.get('https://graph.microsoft.com/v1.0/me/teamwork', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      });
      
      console.log(`   ✅ Teams integration available`);
    } catch (teamsError) {
      console.log(`   ⚠️ Teams integration: ${teamsError.response?.status} ${teamsError.response?.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Organization check failed: ${error.response?.status} ${error.response?.statusText}`);
    console.log(`   📝 Details: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Main check function
async function checkPermissions() {
  console.log('🔐 TEAMS PERMISSIONS & CONFIGURATION CHECKER');
  console.log('===========================================');
  
  const accessToken = process.env.TEAMS_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No TEAMS_ACCESS_TOKEN environment variable found');
    console.log('   Usage: TEAMS_ACCESS_TOKEN=your_token node check-teams-permissions.js');
    return;
  }
  
  console.log(`🔑 Using access token: ${accessToken.substring(0, 50)}...`);
  
  // Check token scopes
  const validScopes = checkTokenScopes(accessToken);
  
  // Test Graph API permissions
  const permissionResults = await testGraphPermissions(accessToken);
  
  // Check tenant configuration
  await checkTenantConfig(accessToken);
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('==========');
  
  console.log(`🔍 Token Scopes: ${validScopes ? '✅ Valid' : '❌ Invalid'}`);
  
  Object.entries(permissionResults).forEach(([test, result]) => {
    console.log(`${result.success ? '✅' : '❌'} ${test}: ${result.success ? 'Working' : 'Failed'}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n🎯 RECOMMENDATIONS');
  console.log('==================');
  
  if (!validScopes) {
    console.log('• Re-authenticate with proper scopes:');
    console.log('  - https://graph.microsoft.com/OnlineMeetings.ReadWrite');
    console.log('  - https://graph.microsoft.com/Calendars.ReadWrite');
  }
  
  if (!permissionResults['Online Meetings Endpoint']?.success) {
    console.log('• Check Microsoft Teams license for the user');
    console.log('• Verify OnlineMeetings.ReadWrite permission is granted');
    console.log('• Ensure Microsoft Teams is enabled in the tenant');
  }
  
  if (!permissionResults['User Profile Access']?.success) {
    console.log('• Check basic Microsoft Graph permissions');
    console.log('• Verify the token is valid and not expired');
  }
  
  console.log('\n• Test with minimal meeting payload after fixing permissions');
  console.log('• Contact Microsoft support if tenant-level issues persist');
}

// Run the check
if (require.main === module) {
  checkPermissions().catch(console.error);
}

module.exports = { checkPermissions, checkTokenScopes, testGraphPermissions };