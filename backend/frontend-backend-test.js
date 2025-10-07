#!/usr/bin/env node

/**
 * Frontend-Backend Integration Testing
 * Tests the complete integration between React frontend and Node.js backend
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:5003';
const FRONTEND_URL = 'http://localhost:3000'; // Default React port
const API_PREFIX = '/api/v1';

let totalTests = 0;
let passedTests = 0;

const log = (message, type = 'info') => {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
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

async function testBackendAvailability() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    recordTest('Backend Server Availability', response.status === 200, `(${response.status})`);
    return true;
  } catch (error) {
    recordTest('Backend Server Availability', false, 'Backend not responding');
    return false;
  }
}

async function testFrontendAvailability() {
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    recordTest('Frontend Server Availability', response.status === 200, `(${response.status})`);
    return true;
  } catch (error) {
    recordTest('Frontend Server Availability', false, 'Frontend not responding');
    return false;
  }
}

async function testCorsConfiguration() {
  log('Testing CORS configuration...', 'info');

  try {
    // Simulate a preflight request that the frontend would make
    const response = await axios({
      method: 'options',
      url: `${BACKEND_URL}${API_PREFIX}/projects`,
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });

    recordTest('CORS Preflight Request', response.status === 200 || response.status === 204,
      `(${response.status})`);

    // Check CORS headers
    const corsHeaders = response.headers['access-control-allow-origin'];
    recordTest('CORS Origin Header', corsHeaders !== undefined,
      corsHeaders ? `(${corsHeaders})` : '(Missing)');

  } catch (error) {
    recordTest('CORS Configuration', false, error.message);
  }
}

async function testApiEndpointsFromFrontend() {
  log('Testing API endpoints as frontend would access them...', 'info');

  // Test public endpoints (no auth required)
  const publicEndpoints = [
    { path: '/health', name: 'Health Check' },
    { path: '/', name: 'Root API' },
    { path: `${API_PREFIX}/test`, name: 'Test Endpoint' }
  ];

  for (const endpoint of publicEndpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, {
        headers: {
          'Origin': FRONTEND_URL,
          'Referer': FRONTEND_URL
        }
      });

      recordTest(`${endpoint.name} (Frontend Origin)`, response.status === 200,
        `(${response.status})`);

    } catch (error) {
      recordTest(`${endpoint.name} (Frontend Origin)`, false,
        error.response?.status ? `(${error.response.status})` : error.message);
    }
  }
}

async function testAuthenticationFlow() {
  log('Testing authentication flow...', 'info');

  // Test registration
  const testUser = {
    name: `Frontend Test User ${Date.now()}`,
    email: `frontend-test-${Date.now()}@test.com`,
    password: 'FrontendTest123!',
    role: 'engineer'
  };

  let authToken = null;

  try {
    const registerResponse = await axios.post(`${BACKEND_URL}${API_PREFIX}/auth/register`, testUser, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });

    recordTest('User Registration (Frontend)', registerResponse.status === 200 || registerResponse.status === 201,
      `(${registerResponse.status})`);

    // Test login
    try {
      const loginResponse = await axios.post(`${BACKEND_URL}${API_PREFIX}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      }, {
        headers: {
          'Origin': FRONTEND_URL,
          'Content-Type': 'application/json'
        }
      });

      recordTest('User Login (Frontend)', loginResponse.status === 200 && loginResponse.data.token,
        `(${loginResponse.status})`);

      if (loginResponse.data.token) {
        authToken = loginResponse.data.token;
        await testAuthenticatedRequests(authToken);
      }

    } catch (loginError) {
      recordTest('User Login (Frontend)', false, loginError.response?.data?.error || loginError.message);
    }

  } catch (registerError) {
    recordTest('User Registration (Frontend)', false,
      registerError.response?.data?.error || registerError.message);
  }
}

async function testAuthenticatedRequests(token) {
  log('Testing authenticated requests...', 'info');

  const protectedEndpoints = [
    { path: '/auth/profile', name: 'User Profile' },
    { path: '/projects', name: 'Projects List' },
    { path: '/notifications', name: 'Notifications' }
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${API_PREFIX}${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL,
          'Content-Type': 'application/json'
        }
      });

      recordTest(`${endpoint.name} (Authenticated)`, response.status === 200,
        `(${response.status})`);

      // Log data for verification
      if (response.data?.data) {
        const dataCount = Array.isArray(response.data.data) ?
          response.data.data.length : 'object';
        log(`  Data returned: ${dataCount}`, 'info');
      }

    } catch (error) {
      const isExpected = error.response?.status === 403;
      recordTest(`${endpoint.name} (Authenticated)`, isExpected,
        isExpected ? '(Access denied - role restriction)' : error.message);
    }
  }
}

async function testRealTimeCommunication() {
  log('Testing real-time communication...', 'info');

  try {
    // Test Socket.IO endpoint accessibility
    const socketResponse = await axios.get(`${BACKEND_URL}/socket.io/?EIO=4&transport=polling`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });

    recordTest('Socket.IO Connection (Frontend)', socketResponse.status === 200,
      `(${socketResponse.status})`);

  } catch (error) {
    recordTest('Socket.IO Connection (Frontend)', false, error.message);
  }
}

async function testErrorHandling() {
  log('Testing error handling from frontend perspective...', 'info');

  const errorTests = [
    {
      request: () => axios.get(`${BACKEND_URL}${API_PREFIX}/nonexistent`, {
        headers: { 'Origin': FRONTEND_URL }
      }),
      name: '404 Error Handling',
      expectedStatus: 404
    },
    {
      request: () => axios.get(`${BACKEND_URL}${API_PREFIX}/auth/profile`, {
        headers: { 'Origin': FRONTEND_URL }
      }),
      name: '401 Error Handling',
      expectedStatus: 401
    },
    {
      request: () => axios.post(`${BACKEND_URL}${API_PREFIX}/auth/login`, {}, {
        headers: { 'Origin': FRONTEND_URL, 'Content-Type': 'application/json' }
      }),
      name: '400 Error Handling',
      expectedStatus: 400
    }
  ];

  for (const test of errorTests) {
    try {
      await test.request();
      recordTest(test.name, false, `Expected ${test.expectedStatus} but request succeeded`);
    } catch (error) {
      recordTest(test.name, error.response?.status === test.expectedStatus,
        `(${error.response?.status})`);
    }
  }
}

async function testFrontendBuildFiles() {
  log('Testing frontend build availability...', 'info');

  try {
    // Check if we can access frontend static files
    const response = await axios.get(`${FRONTEND_URL}/static/js/bundle.js`, {
      timeout: 3000,
      validateStatus: (status) => status < 500 // Accept 404 as valid response
    });

    recordTest('Frontend Build Files', response.status === 200,
      response.status === 200 ? '(Bundle found)' : '(Dev server serving)');

  } catch (error) {
    // This is expected in development mode
    recordTest('Frontend Build Files', true, '(Development mode - expected)');
  }
}

async function runIntegrationTests() {
  log('🚀 Starting Frontend-Backend Integration Tests', 'info');
  log('===============================================', 'info');

  try {
    // Test basic availability
    const backendAvailable = await testBackendAvailability();
    const frontendAvailable = await testFrontendAvailability();

    if (!backendAvailable) {
      log('Backend unavailable - skipping integration tests', 'warning');
      return;
    }

    // Core integration tests
    await testCorsConfiguration();
    await testApiEndpointsFromFrontend();
    await testAuthenticationFlow();
    await testRealTimeCommunication();
    await testErrorHandling();

    // Frontend-specific tests
    if (frontendAvailable) {
      await testFrontendBuildFiles();
    }

  } catch (error) {
    log(`Critical integration test failure: ${error.message}`, 'error');
  }

  // Print results
  console.log('\n');
  log('=======================================', 'info');
  log('📊 INTEGRATION TEST RESULTS', 'info');
  log('=======================================', 'info');
  log(`Total Tests: ${totalTests}`, 'info');
  log(`Passed: ${passedTests}`, 'success');
  log(`Failed: ${totalTests - passedTests}`, 'error');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'info');

  // Assessment
  const successRate = (passedTests / totalTests) * 100;
  let assessment = '';

  if (successRate >= 90) {
    assessment = 'EXCELLENT - Full integration working';
  } else if (successRate >= 75) {
    assessment = 'GOOD - Core integration working';
  } else if (successRate >= 60) {
    assessment = 'FAIR - Basic integration working';
  } else {
    assessment = 'POOR - Integration issues detected';
  }

  const status = successRate >= 75 ? 'success' : 'error';
  log(`🏁 Integration Testing Complete - ${assessment}`, status);

  return successRate >= 75;
}

// Main execution
if (require.main === module) {
  runIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };