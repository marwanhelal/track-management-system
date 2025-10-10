const axios = require('axios');

const BASE_URL = 'http://localhost:5004/api/v1';

let accessToken = '';

// Test data - using existing users from database
const supervisorCredentials = {
  email: 'marwan@test.com',
  password: 'password' // Common default password
};

const engineerCredentials = {
  email: 'ahmed@gmail.com',
  password: 'password'
};

async function testAPI() {
  try {
    console.log('🚀 Testing Early Access API Implementation\n');

    // Step 1: Test supervisor login
    console.log('1️⃣ Testing supervisor login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, supervisorCredentials);
      accessToken = loginResponse.data.data.tokens.accessToken;
      console.log('✅ Supervisor login successful');
      console.log(`📝 Access token: ${accessToken.substring(0, 20)}...`);
    } catch (error) {
      console.log('ℹ️ Supervisor login failed (probably no user exists), continuing with tests...');
      // For testing, we'll create mock headers
      accessToken = 'mock-token-for-testing';
    }

    // Step 2: Get project phases
    console.log('\n2️⃣ Testing get project phases...');
    try {
      const phasesResponse = await axios.get(`${BASE_URL}/phases/project/1`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const phases = phasesResponse.data.data.phases;
      console.log(`✅ Found ${phases.length} phases for project 1`);

      if (phases.length > 0) {
        const phase = phases[0];
        console.log(`📋 Sample phase: ${phase.phase_name}`);
        console.log(`📊 Status: ${phase.status}`);
        console.log(`🔥 Early access granted: ${phase.early_access_granted}`);
        console.log(`🔥 Early access status: ${phase.early_access_status}`);

        // Step 3: Test grant early access
        console.log('\n3️⃣ Testing grant early access...');
        try {
          const grantResponse = await axios.post(
            `${BASE_URL}/phases/${phase.id}/grant-early-access`,
            { note: 'Testing early access for trusted client - Phase ' + phase.phase_name },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          console.log('✅ Early access granted successfully');
          console.log(`📝 Response: ${grantResponse.data.message}`);

          // Step 4: Test early access overview
          console.log('\n4️⃣ Testing early access overview...');
          const overviewResponse = await axios.get(
            `${BASE_URL}/phases/project/1/early-access-overview`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          console.log('✅ Early access overview retrieved');
          const overview = overviewResponse.data.data.overview;
          console.log(`📊 Total early access phases: ${overview.total_early_access_phases}`);
          console.log(`🚀 Active early access phases: ${overview.active_early_access_phases}`);

          // Step 5: Test start phase with early access
          console.log('\n5️⃣ Testing start phase with early access...');
          const startResponse = await axios.post(
            `${BASE_URL}/phases/${phase.id}/start`,
            { note: 'Starting phase via early access' },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          console.log('✅ Phase started via early access');
          console.log(`📝 Response: ${startResponse.data.message}`);

        } catch (error) {
          console.log(`⚠️ Grant early access failed: ${error.response?.data?.error || error.message}`);
        }
      }

    } catch (error) {
      console.log(`❌ Get phases failed: ${error.response?.data?.error || error.message}`);
    }

    console.log('\n🎉 API Testing Complete!');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run tests
testAPI();