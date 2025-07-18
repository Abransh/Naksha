#!/usr/bin/env node

/**
 * Teams Meeting Test Script - Minimal Payload
 * 
 * This script tests the minimal Teams meeting creation payload
 * to verify the fix for Microsoft Graph API Error 9038
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

// Test minimal Teams meeting creation directly
async function testMinimalTeamsMeeting(accessToken) {
  console.log('\n🧪 TESTING MINIMAL TEAMS MEETING CREATION');
  console.log('==========================================');
  
  if (!accessToken) {
    console.log('❌ No access token provided');
    return false;
  }

  // Analyze token first
  const tokenPayload = decodeJWT(accessToken);
  if (tokenPayload) {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = tokenPayload.exp;
    
    console.log('🔍 Token Analysis:');
    console.log(`   Current Time: ${currentTime}`);
    console.log(`   Token Expires: ${expirationTime}`);
    console.log(`   Is Expired: ${currentTime > expirationTime}`);
    console.log(`   Expires In: ${expirationTime - currentTime} seconds`);
    
    if (currentTime > expirationTime) {
      console.log('❌ Token is expired, cannot proceed');
      return false;
    }
  }

  // Test 1: Absolute minimal payload (just required fields)
  console.log('\n📝 Test 1: Absolute Minimal Payload');
  console.log('-----------------------------------');
  
  const minimalPayload = {
    subject: 'Test Meeting - Minimal',
    startDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    endDateTime: new Date(Date.now() + 7200000).toISOString()    // 2 hours from now
  };
  
  try {
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      minimalPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Minimal payload SUCCESS:', {
      meetingId: response.data.id,
      joinUrl: response.data.joinWebUrl,
      subject: response.data.subject
    });
    
    // Clean up - delete the test meeting
    try {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/me/onlineMeetings/${response.data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      console.log('🗑️ Test meeting cleaned up');
    } catch (deleteError) {
      console.log('⚠️ Could not clean up test meeting (this is okay)');
    }
    
  } catch (error) {
    console.error('❌ Minimal payload FAILED:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code
    });
    return false;
  }

  // Test 2: Enhanced payload (with meeting settings but no chatInfo)
  console.log('\n📝 Test 2: Enhanced Payload (No ChatInfo)');
  console.log('------------------------------------------');
  
  const enhancedPayload = {
    subject: 'Test Meeting - Enhanced',
    startDateTime: new Date(Date.now() + 3600000).toISOString(),
    endDateTime: new Date(Date.now() + 7200000).toISOString(),
    allowedPresenters: 'organizer',
    allowAttendeeToEnableCamera: true,
    allowAttendeeToEnableMic: true,
    allowMeetingChat: 'enabled',
    allowTeamworkReactions: true
  };
  
  try {
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      enhancedPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Enhanced payload SUCCESS:', {
      meetingId: response.data.id,
      joinUrl: response.data.joinWebUrl,
      subject: response.data.subject,
      allowedPresenters: response.data.allowedPresenters,
      allowMeetingChat: response.data.allowMeetingChat
    });
    
    // Clean up
    try {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/me/onlineMeetings/${response.data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      console.log('🗑️ Test meeting cleaned up');
    } catch (deleteError) {
      console.log('⚠️ Could not clean up test meeting (this is okay)');
    }
    
  } catch (error) {
    console.error('❌ Enhanced payload FAILED:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code
    });
    return false;
  }

  // Test 3: Problematic payload (with chatInfo to confirm it fails)
  console.log('\n📝 Test 3: Problematic Payload (With ChatInfo)');
  console.log('-----------------------------------------------');
  
  const problematicPayload = {
    subject: 'Test Meeting - Problematic',
    startDateTime: new Date(Date.now() + 3600000).toISOString(),
    endDateTime: new Date(Date.now() + 7200000).toISOString(),
    allowedPresenters: 'organizer',
    allowAttendeeToEnableCamera: true,
    allowAttendeeToEnableMic: true,
    allowMeetingChat: 'enabled',
    allowTeamworkReactions: true,
    chatInfo: {
      threadId: `test-${Date.now()}`
    }
  };
  
  try {
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/onlineMeetings',
      problematicPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('⚠️ Problematic payload UNEXPECTEDLY SUCCEEDED:', {
      meetingId: response.data.id,
      joinUrl: response.data.joinWebUrl
    });
    
    // Clean up
    try {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/me/onlineMeetings/${response.data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (deleteError) {
      // Ignore cleanup errors
    }
    
  } catch (error) {
    console.log('✅ Problematic payload FAILED as expected:', {
      status: error.response?.status,
      error: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code
    });
    
    // This is expected - chatInfo with custom threadId should fail
    if (error.response?.data?.error?.message?.includes('9038') || 
        error.response?.data?.error?.message?.includes('chat thread')) {
      console.log('🎯 Confirmed: chatInfo with custom threadId causes Error 9038');
    }
  }

  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  console.log('✅ Minimal payload: Should work');
  console.log('✅ Enhanced payload (no chatInfo): Should work');
  console.log('❌ Problematic payload (with chatInfo): Should fail with Error 9038');
  
  return true;
}

// Main test function
async function runTest() {
  console.log('🧪 TEAMS MEETING MINIMAL PAYLOAD TEST');
  console.log('===================================');
  
  const accessToken = process.env.TEAMS_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No TEAMS_ACCESS_TOKEN environment variable found');
    console.log('   Usage: TEAMS_ACCESS_TOKEN=your_token node test-teams-minimal.js');
    return;
  }
  
  console.log(`🔑 Using access token: ${accessToken.substring(0, 50)}...`);
  
  await testMinimalTeamsMeeting(accessToken);
}

// Run the test
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { testMinimalTeamsMeeting };