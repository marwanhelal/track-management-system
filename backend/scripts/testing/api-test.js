#!/usr/bin/env node

/**
 * Simple API Endpoint Testing
 * Tests all backend API endpoints for basic functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5003';
const API_PREFIX = '/api/v1';

// Test Results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

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
    failedTests++;
    log(`${name} - FAILED ${details}`, 'error');
  }
};

// Test authentication and get tokens
let authToken = null;

async function testHealthEndpoint() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    recordTest('Health Endpoint', response.status === 200, `(${response.status})`);

    if (response.data) {
      log(`Health Status: ${response.data.status}`, 'info');
      log(`Database: ${response.data.database?.status}`, 'info');
    }
  } catch (error) {
    recordTest('Health Endpoint', false, error.message);
  }
}

async function testRootEndpoint() {
  try {
    const response = await axios.get(`${BASE_URL}/`);
    recordTest('Root Endpoint', response.status === 200 && response.data.success, `(${response.status})`);

    if (response.data) {
      log(`API Message: ${response.data.message}`, 'info');
      log(`Version: ${response.data.version}`, 'info');
    }
  } catch (error) {
    recordTest('Root Endpoint', false, error.message);
  }
}

async function testAPITestEndpoint() {
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/test`);
    recordTest('API Test Endpoint', response.status === 200 && response.data.success, `(${response.status})`);
  } catch (error) {
    recordTest('API Test Endpoint', false, error.message);
  }
}

async function testUserRegistration() {
  const testUser = {
    name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@test.com`,
    password: 'testPassword123',
    role: 'engineer'
  };

  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register`, testUser);
    recordTest('User Registration', response.status === 200 || response.status === 201, `(${response.status})`);

    // Try to login with the new user
    if (response.status === 200 || response.status === 201) {
      await testUserLogin(testUser.email, testUser.password);
    }
  } catch (error) {
    recordTest('User Registration', false, error.response?.data?.error || error.message);
  }
}

async function testUserLogin(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/login`, {
      email: email || 'test@test.com',
      password: password || 'password123'
    });

    recordTest('User Login', response.status === 200 && response.data.token, `(${response.status})`);

    if (response.data.token) {
      authToken = response.data.token;
      log('Auth token obtained successfully', 'success');

      // Test profile endpoint with token
      await testAuthenticatedEndpoint();
    }
  } catch (error) {
    recordTest('User Login', false, error.response?.data?.error || error.message);
  }
}

async function testAuthenticatedEndpoint() {
  if (!authToken) {
    recordTest('Authenticated Endpoint', false, 'No auth token available');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    recordTest('Profile Endpoint', response.status === 200, `(${response.status})`);

    if (response.data.data) {
      log(`User: ${response.data.data.name} (${response.data.data.role})`, 'info');
    }
  } catch (error) {
    recordTest('Profile Endpoint', false, error.response?.data?.error || error.message);
  }
}

async function testProtectedEndpoints() {
  if (!authToken) {
    recordTest('Protected Endpoints', false, 'No auth token available');
    return;
  }

  const endpoints = [
    { path: '/projects', name: 'Projects' },
    { path: '/phases', name: 'Phases' },
    { path: '/work-logs', name: 'Work Logs' },
    { path: '/notifications', name: 'Notifications' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${API_PREFIX}${endpoint.path}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      recordTest(`${endpoint.name} Endpoint`, response.status === 200, `(${response.status})`);

      if (response.data?.data) {
        log(`${endpoint.name}: ${Array.isArray(response.data.data) ? response.data.data.length : 'N/A'} items`, 'info');
      }
    } catch (error) {
      const isExpected = error.response?.status === 403; // Role-based access might deny some endpoints
      recordTest(`${endpoint.name} Endpoint`,
        error.response?.status === 200 || isExpected,
        isExpected ? '(Access denied - expected for role)' : error.message
      );
    }
  }
}

async function testErrorHandling() {
  // Test 404 error
  try {
    await axios.get(`${BASE_URL}${API_PREFIX}/nonexistent`);
    recordTest('404 Error Handling', false, 'Should have returned 404');
  } catch (error) {
    recordTest('404 Error Handling', error.response?.status === 404, `(${error.response?.status})`);
  }

  // Test unauthorized access
  try {
    await axios.get(`${BASE_URL}${API_PREFIX}/auth/profile`); // No token
    recordTest('401 Error Handling', false, 'Should have returned 401');
  } catch (error) {
    recordTest('401 Error Handling', error.response?.status === 401, `(${error.response?.status})`);
  }

  // Test malformed request
  try {
    await axios.post(`${BASE_URL}${API_PREFIX}/auth/login`, { invalid: 'data' });
    recordTest('400 Error Handling', false, 'Should have returned 400');
  } catch (error) {
    recordTest('400 Error Handling',
      error.response?.status === 400 || error.response?.status === 422,
      `(${error.response?.status})`
    );
  }
}

async function runAllTests() {
  log('🚀 Starting API Endpoint Tests', 'info');
  log('==============================', 'info');

  try {
    // Basic endpoint tests
    await testHealthEndpoint();
    await testRootEndpoint();
    await testAPITestEndpoint();

    // Authentication tests
    await testUserRegistration();

    // Try login with potentially existing user
    if (!authToken) {
      await testUserLogin();
    }

    // Protected endpoint tests
    await testProtectedEndpoints();

    // Error handling tests
    await testErrorHandling();

  } catch (error) {
    log(`Critical test failure: ${error.message}`, 'error');
  }

  // Print summary
  console.log('\n');
  log('=============================', 'info');
  log('📊 API TEST RESULTS', 'info');
  log('=============================', 'info');
  log(`Total Tests: ${totalTests}`, 'info');
  log(`Passed: ${passedTests}`, 'success');
  log(`Failed: ${failedTests}`, 'error');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'info');

  const status = failedTests === 0 ? 'success' : 'error';
  log(`🏁 API Testing Complete - ${failedTests === 0 ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!'}`, status);

  return failedTests === 0;
}

// Main execution
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };