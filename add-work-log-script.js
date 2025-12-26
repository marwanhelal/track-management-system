/**
 * Script to add work log for Rostom on completed "Principle project" phase
 * Uses the existing admin endpoint that bypasses phase status checks
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5005/api/v1';

async function addWorkLog() {
  try {
    console.log('🔄 Adding work log for Rostom...\n');

    // First, login as supervisor to get auth token
    console.log('Step 1: Logging in as supervisor...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.SUPER_ADMIN_EMAIL || 'marwanhelal15@gmail.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'your-password-here'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    // Add work log using admin endpoint
    console.log('Step 2: Adding 30 hours work log...');
    const workLogResponse = await axios.post(
      `${API_URL}/work-logs/admin`,
      {
        engineer_id: 37,              // Rostom
        phase_id: 190,                // Principle project
        hours: 30,                    // 30 hours
        description: 'Historical work log entry - Added by supervisor for completed phase',
        date: '2025-03-21'            // Adjust date as needed
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Work log added successfully!\n');
    console.log('Work Log Details:');
    console.log('----------------');
    console.log(`ID: ${workLogResponse.data.data.workLog.id}`);
    console.log(`Engineer: ${workLogResponse.data.data.workLog.engineer_name}`);
    console.log(`Phase: ${workLogResponse.data.data.workLog.phase_name}`);
    console.log(`Project: ${workLogResponse.data.data.workLog.project_name}`);
    console.log(`Hours: ${workLogResponse.data.data.workLog.hours}`);
    console.log(`Date: ${workLogResponse.data.data.workLog.date}`);
    console.log(`\n✨ Done! The work log has been added to the completed phase.`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('\n⚠️  Authentication failed. Please check your supervisor credentials in the script.');
    }
  }
}

// Run the script
addWorkLog();
