#!/usr/bin/env node

/**
 * Test with existing users and data
 */

const { Client } = require('pg');
const axios = require('axios');

const BASE_URL = 'http://localhost:5003';
const API_PREFIX = '/api/v1';

let totalTests = 0;
let passedTests = 0;

const log = (message, type = 'info') => {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    test: '🧪'
  }[type] || '📋';
  console.log(`${prefix} ${message}`);
};

const recordTest = (name, passed, details = '') => {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`${name} - PASSED ${details}`, 'success');
  } else {
    log(`${name} - FAILED ${details}`, 'error');
  }
};

async function checkExistingData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'track_management',
    user: 'postgres',
    password: '25180047m5'
  });

  try {
    await client.connect();
    log('Connected to database', 'success');

    // Check existing users
    const users = await client.query('SELECT id, name, email, role, is_active FROM users LIMIT 5');
    log(`Found ${users.rows.length} users in database`, 'info');

    if (users.rows.length > 0) {
      log('Sample users:', 'info');
      users.rows.forEach((user, index) => {
        log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role} - Active: ${user.is_active}`, 'info');
      });

      // Try to test with first active user
      const activeUser = users.rows.find(u => u.is_active);
      if (activeUser) {
        await testWithExistingUser(activeUser);
      }
    }

    // Check projects
    const projects = await client.query('SELECT id, name, status FROM projects LIMIT 3');
    log(`Found ${projects.rows.length} projects`, 'info');

    // Check work logs
    const workLogs = await client.query('SELECT COUNT(*) as count FROM work_logs');
    log(`Found ${workLogs.rows[0].count} work log entries`, 'info');

    // Check phases
    const phases = await client.query('SELECT COUNT(*) as count FROM project_phases');
    log(`Found ${phases.rows[0].count} project phases`, 'info');

    recordTest('Database Data Validation', true, `Users: ${users.rows.length}, Projects: ${projects.rows.length}`);

    await client.end();
    return users.rows;

  } catch (error) {
    log(`Database check failed: ${error.message}`, 'error');
    recordTest('Database Data Validation', false, error.message);
    return [];
  }
}

async function testWithExistingUser(user) {
  log(`Testing with existing user: ${user.name} (${user.email})`, 'info');

  // Create a test user registration to understand validation requirements
  const testUser = {
    name: `Test User ${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    role: 'engineer'
  };

  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register`, testUser);
    recordTest('New User Registration', response.status === 200 || response.status === 201, `(${response.status})`);

    if (response.data.token) {
      await testAuthenticatedEndpoints(response.data.token);
    }
  } catch (error) {
    log(`Registration error details: ${error.response?.data?.message || error.response?.data?.error || 'Unknown error'}`, 'error');

    if (error.response?.data?.errors) {
      log('Validation errors:', 'error');
      error.response.data.errors.forEach(err => {
        log(`  - ${err.field}: ${err.message}`, 'error');
      });
    }

    recordTest('New User Registration', false, error.response?.data?.error || error.message);
  }
}

async function testAuthenticatedEndpoints(token) {
  const endpoints = [
    { path: '/projects', name: 'Projects List', method: 'GET' },
    { path: '/phases', name: 'Phases List', method: 'GET' },
    { path: '/work-logs', name: 'Work Logs List', method: 'GET' },
    { path: '/notifications', name: 'Notifications', method: 'GET' },
    { path: '/auth/profile', name: 'User Profile', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method.toLowerCase(),
        url: `${BASE_URL}${API_PREFIX}${endpoint.path}`,
        headers: { Authorization: `Bearer ${token}` }
      });

      recordTest(endpoint.name, response.status === 200, `(${response.status})`);

      if (response.data?.data && Array.isArray(response.data.data)) {
        log(`  ${endpoint.name}: ${response.data.data.length} items`, 'info');
      } else if (response.data?.data) {
        log(`  ${endpoint.name}: Data returned`, 'info');
      }

    } catch (error) {
      const isExpectedError = error.response?.status === 403; // Role-based access
      recordTest(endpoint.name, isExpectedError,
        isExpectedError ? '(Access denied - role restriction)' : error.message);
    }
  }
}

async function testRealTimeConnection() {
  log('Testing real-time capabilities...', 'info');

  // Test Socket.IO connection - simplified check
  try {
    const response = await axios.get(`${BASE_URL}/socket.io/?EIO=4&transport=polling`);
    recordTest('Socket.IO Polling Transport', response.status === 200, '(Socket.IO available)');
  } catch (error) {
    recordTest('Socket.IO Polling Transport', false, 'Socket.IO not accessible');
  }
}

async function testDataFlow() {
  log('Testing data flow and relationships...', 'info');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'track_management',
    user: 'postgres',
    password: '25180047m5'
  });

  try {
    await client.connect();

    // Test referential integrity
    const orphanedPhases = await client.query(`
      SELECT COUNT(*) as count
      FROM project_phases pp
      LEFT JOIN projects p ON pp.project_id = p.id
      WHERE p.id IS NULL
    `);

    recordTest('Data Integrity (Phases)',
      orphanedPhases.rows[0].count === '0',
      `Orphaned phases: ${orphanedPhases.rows[0].count}`);

    // Test calculated fields
    const projectHours = await client.query(`
      SELECT p.id, p.name, p.actual_hours,
             COALESCE(SUM(wl.hours), 0) as calculated_hours
      FROM projects p
      LEFT JOIN work_logs wl ON p.id = wl.project_id
      GROUP BY p.id, p.name, p.actual_hours
      LIMIT 3
    `);

    let hoursConsistent = true;
    for (const project of projectHours.rows) {
      if (parseFloat(project.actual_hours) !== parseFloat(project.calculated_hours)) {
        hoursConsistent = false;
        break;
      }
    }

    recordTest('Calculated Hours Consistency', hoursConsistent,
      `Checked ${projectHours.rows.length} projects`);

    // Test database triggers
    const triggerTest = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);

    recordTest('Database Triggers',
      triggerTest.rows[0].count > 0,
      `Found ${triggerTest.rows[0].count} triggers`);

    await client.end();

  } catch (error) {
    recordTest('Data Flow Testing', false, error.message);
  }
}

async function runComprehensiveTest() {
  log('🚀 Starting Comprehensive System Tests', 'info');
  log('=====================================', 'info');

  try {
    // Check existing data
    const users = await checkExistingData();

    // Test real-time connection
    await testRealTimeConnection();

    // Test data flow and integrity
    await testDataFlow();

    // Test API with different validation approaches
    await testRegistrationValidation();

  } catch (error) {
    log(`Critical error: ${error.message}`, 'error');
  }

  // Print final results
  console.log('\n');
  log('====================================', 'info');
  log('📊 COMPREHENSIVE TEST RESULTS', 'info');
  log('====================================', 'info');
  log(`Total Tests: ${totalTests}`, 'info');
  log(`Passed: ${passedTests}`, 'success');
  log(`Failed: ${totalTests - passedTests}`, 'error');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'info');

  const status = passedTests === totalTests ? 'success' : 'error';
  log(`🏁 Testing Complete - ${passedTests === totalTests ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!'}`, status);
}

async function testRegistrationValidation() {
  log('Testing registration with different validation approaches...', 'info');

  const testCases = [
    {
      name: 'Valid Engineer Registration',
      data: {
        name: 'Test Engineer User',
        email: `engineer-${Date.now()}@test.com`,
        password: 'ValidPassword123!',
        role: 'engineer'
      }
    },
    {
      name: 'Valid Supervisor Registration',
      data: {
        name: 'Test Supervisor User',
        email: `supervisor-${Date.now()}@test.com`,
        password: 'SupervisorPass123!',
        role: 'supervisor'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      const response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register`, testCase.data);
      recordTest(testCase.name, response.status === 200 || response.status === 201, `(${response.status})`);

      // Try login with the new user
      if (response.status === 200 || response.status === 201) {
        try {
          const loginResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/login`, {
            email: testCase.data.email,
            password: testCase.data.password
          });

          recordTest(`${testCase.name} - Login`, loginResponse.status === 200 && loginResponse.data.token,
            `(${loginResponse.status})`);

          if (loginResponse.data.token) {
            await testAuthenticatedEndpoints(loginResponse.data.token);
          }
        } catch (loginError) {
          recordTest(`${testCase.name} - Login`, false, loginError.response?.data?.error || loginError.message);
        }
      }

    } catch (error) {
      recordTest(testCase.name, false,
        error.response?.data?.error || error.response?.data?.message || error.message);

      if (error.response?.data?.errors) {
        log('Validation details:', 'error');
        error.response.data.errors.forEach(err => {
          log(`  - ${err.field || err.param}: ${err.message || err.msg}`, 'error');
        });
      }
    }
  }
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});