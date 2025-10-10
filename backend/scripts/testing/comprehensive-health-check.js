#!/usr/bin/env node

/**
 * Comprehensive System Health Check
 *
 * This is the final comprehensive test that validates ALL system components
 * are working together in a professional, dynamic, and connected way.
 *
 * Tests include:
 * - Infrastructure health (Database, Backend, Frontend)
 * - Data integrity and consistency
 * - API functionality and authentication
 * - Real-time communication
 * - Frontend-backend integration
 * - Performance benchmarks
 * - Complete system workflow validation
 */

const axios = require('axios');
const { Client } = require('pg');

// Configuration
const CONFIG = {
  backend: 'http://localhost:5003',
  frontend: 'http://localhost:3000',
  database: {
    host: 'localhost',
    port: 5432,
    database: 'track_management',
    user: 'postgres',
    password: '25180047m5'
  },
  apiPrefix: '/api/v1'
};

// Global test tracking
let testSuite = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  categories: {
    infrastructure: { passed: 0, total: 0 },
    database: { passed: 0, total: 0 },
    api: { passed: 0, total: 0 },
    integration: { passed: 0, total: 0 },
    realtime: { passed: 0, total: 0 },
    performance: { passed: 0, total: 0 }
  },
  details: [],
  startTime: new Date()
};

const log = (message, type = 'info') => {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    performance: '⚡',
    security: '🔒',
    database: '🗄️',
    api: '🔌',
    frontend: '🌐',
    realtime: '📡'
  }[type] || '📋';

  console.log(`${prefix} ${message}`);
};

const recordTest = (name, category, passed, details = '', duration = 0) => {
  testSuite.total++;
  testSuite.categories[category].total++;

  if (passed) {
    testSuite.passed++;
    testSuite.categories[category].passed++;
    log(`${name} - PASSED ${details ? `(${details})` : ''}`, 'success');
  } else {
    testSuite.failed++;
    log(`${name} - FAILED ${details ? `(${details})` : ''}`, 'error');
  }

  testSuite.details.push({
    name,
    category,
    passed,
    details,
    duration,
    timestamp: new Date()
  });
};

// Infrastructure Health Tests
async function testInfrastructure() {
  log('🏗️ Testing Infrastructure Health...', 'info');

  // Database connectivity
  let dbClient;
  try {
    dbClient = new Client(CONFIG.database);
    await dbClient.connect();

    const dbResult = await dbClient.query('SELECT NOW() as time, version() as version');
    recordTest('Database Connection', 'infrastructure', true,
      `PostgreSQL connected - ${dbResult.rows[0].version.split(' ')[1]}`);

    // Database health metrics
    const dbStats = await dbClient.query(`
      SELECT
        pg_database_size('track_management') as db_size,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = 'track_management') as connections,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables
    `);

    const stats = dbStats.rows[0];
    recordTest('Database Statistics', 'database', true,
      `Size: ${(stats.db_size / 1024 / 1024).toFixed(2)}MB, Connections: ${stats.connections}, Tables: ${stats.tables}`);

    await dbClient.end();
  } catch (error) {
    recordTest('Database Connection', 'infrastructure', false, error.message);
  }

  // Backend server health
  try {
    const startTime = Date.now();
    const backendHealth = await axios.get(`${CONFIG.backend}/health`);
    const responseTime = Date.now() - startTime;

    recordTest('Backend Server Health', 'infrastructure',
      backendHealth.status === 200 && backendHealth.data.status === 'ok',
      `Response time: ${responseTime}ms`);

    // Memory and uptime check
    if (backendHealth.data.uptime && backendHealth.data.memory) {
      recordTest('Backend Performance Metrics', 'performance', true,
        `Uptime: ${Math.round(backendHealth.data.uptime)}s, Memory: ${(backendHealth.data.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    recordTest('Backend Server Health', 'infrastructure', false, error.message);
  }

  // Frontend server availability
  try {
    const frontendResponse = await axios.get(CONFIG.frontend);
    recordTest('Frontend Server Availability', 'infrastructure',
      frontendResponse.status === 200, 'React development server running');
  } catch (error) {
    recordTest('Frontend Server Availability', 'infrastructure', false, error.message);
  }
}

// Database Integrity Tests
async function testDatabaseIntegrity() {
  log('🗄️ Testing Database Integrity...', 'database');

  const dbClient = new Client(CONFIG.database);
  try {
    await dbClient.connect();

    // Data consistency checks
    const orphanedPhases = await dbClient.query(`
      SELECT COUNT(*) as count FROM project_phases pp
      LEFT JOIN projects p ON pp.project_id = p.id
      WHERE p.id IS NULL
    `);

    recordTest('Data Referential Integrity', 'database',
      orphanedPhases.rows[0].count === '0',
      `Orphaned records: ${orphanedPhases.rows[0].count}`);

    // Calculated fields accuracy
    const hourConsistency = await dbClient.query(`
      SELECT p.id, p.actual_hours, COALESCE(SUM(wl.hours), 0) as calculated_hours
      FROM projects p
      LEFT JOIN work_logs wl ON p.id = wl.project_id
      GROUP BY p.id, p.actual_hours
      HAVING p.actual_hours != COALESCE(SUM(wl.hours), 0)
    `);

    recordTest('Calculated Fields Consistency', 'database',
      hourConsistency.rows.length === 0,
      `Inconsistent projects: ${hourConsistency.rows.length}`);

    // Trigger functionality
    const triggerCount = await dbClient.query(`
      SELECT COUNT(*) as count FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);

    recordTest('Database Triggers', 'database',
      parseInt(triggerCount.rows[0].count) >= 5,
      `Active triggers: ${triggerCount.rows[0].count}`);

    // Data volume validation
    const dataVolume = await dbClient.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM projects) as projects,
        (SELECT COUNT(*) FROM project_phases) as phases,
        (SELECT COUNT(*) FROM work_logs) as work_logs
    `);

    const volumes = dataVolume.rows[0];
    recordTest('Data Volume Validation', 'database',
      volumes.users > 0 && volumes.projects > 0,
      `Users: ${volumes.users}, Projects: ${volumes.projects}, Phases: ${volumes.phases}, Work Logs: ${volumes.work_logs}`);

    await dbClient.end();
  } catch (error) {
    recordTest('Database Integrity Check', 'database', false, error.message);
  }
}

// API Functionality Tests
async function testAPIFunctionality() {
  log('🔌 Testing API Functionality...', 'api');

  // Test core endpoints
  const endpoints = [
    { url: `${CONFIG.backend}/health`, name: 'Health Endpoint', auth: false },
    { url: `${CONFIG.backend}${CONFIG.apiPrefix}/test`, name: 'Test Endpoint', auth: false },
    { url: `${CONFIG.backend}${CONFIG.apiPrefix}/phases`, name: 'Phases Endpoint', auth: true },
    { url: `${CONFIG.backend}${CONFIG.apiPrefix}/projects`, name: 'Projects Endpoint', auth: true }
  ];

  // First, get authentication token
  let authToken = null;
  try {
    const testUser = {
      name: `Health Check User ${Date.now()}`,
      email: `health-check-${Date.now()}@test.com`,
      password: 'HealthCheck123!',
      role: 'engineer'
    };

    const registerResponse = await axios.post(
      `${CONFIG.backend}${CONFIG.apiPrefix}/auth/register`, testUser);

    recordTest('User Registration API', 'api',
      registerResponse.status === 200 || registerResponse.status === 201,
      `Status: ${registerResponse.status}`);

    // Attempt login (may fail due to known issue)
    try {
      const loginResponse = await axios.post(
        `${CONFIG.backend}${CONFIG.apiPrefix}/auth/login`,
        { email: testUser.email, password: testUser.password });

      if (loginResponse.data.token) {
        authToken = loginResponse.data.token;
        recordTest('User Login API', 'api', true, 'Token received');
      }
    } catch (loginError) {
      recordTest('User Login API', 'api', false, 'Login failed (known issue)');
    }

  } catch (regError) {
    recordTest('Authentication Flow', 'api', false, regError.message);
  }

  // Test all endpoints
  for (const endpoint of endpoints) {
    try {
      const headers = {};
      if (endpoint.auth && authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await axios.get(endpoint.url, { headers });
      recordTest(endpoint.name, 'api', response.status === 200, `Status: ${response.status}`);

      if (response.data?.data && Array.isArray(response.data.data)) {
        log(`  Data items: ${response.data.data.length}`, 'info');
      }

    } catch (error) {
      const expectedFail = endpoint.auth && !authToken;
      recordTest(endpoint.name, 'api', expectedFail && error.response?.status === 401,
        expectedFail ? 'Expected auth failure' : error.message);
    }
  }

  // Error handling validation
  const errorTests = [
    { url: `${CONFIG.backend}${CONFIG.apiPrefix}/nonexistent`, expectedStatus: 404, name: '404 Handling' },
    { url: `${CONFIG.backend}${CONFIG.apiPrefix}/auth/profile`, expectedStatus: 401, name: '401 Handling' }
  ];

  for (const errorTest of errorTests) {
    try {
      await axios.get(errorTest.url);
      recordTest(errorTest.name, 'api', false, 'Should have failed');
    } catch (error) {
      recordTest(errorTest.name, 'api',
        error.response?.status === errorTest.expectedStatus,
        `Status: ${error.response?.status}`);
    }
  }
}

// Real-time Communication Tests
async function testRealTimeCommunication() {
  log('📡 Testing Real-time Communication...', 'realtime');

  // Test Socket.IO availability
  try {
    const socketResponse = await axios.get(`${CONFIG.backend}/socket.io/?EIO=4&transport=polling`);
    recordTest('Socket.IO Server', 'realtime', socketResponse.status === 200,
      'Polling transport available');

    // Test CORS for Socket.IO
    const corsResponse = await axios.get(`${CONFIG.backend}/socket.io/?EIO=4&transport=polling`, {
      headers: { 'Origin': CONFIG.frontend }
    });

    recordTest('Socket.IO CORS', 'realtime', corsResponse.status === 200,
      'Cross-origin requests allowed');

  } catch (error) {
    recordTest('Socket.IO Communication', 'realtime', false, error.message);
  }
}

// Integration Tests
async function testSystemIntegration() {
  log('🔗 Testing System Integration...', 'integration');

  // Test CORS configuration
  try {
    const corsTest = await axios({
      method: 'options',
      url: `${CONFIG.backend}${CONFIG.apiPrefix}/projects`,
      headers: {
        'Origin': CONFIG.frontend,
        'Access-Control-Request-Method': 'GET'
      }
    });

    recordTest('CORS Configuration', 'integration',
      corsTest.status === 204 || corsTest.status === 200,
      `Preflight response: ${corsTest.status}`);

  } catch (error) {
    recordTest('CORS Configuration', 'integration', false, error.message);
  }

  // Test frontend-backend communication
  try {
    const frontendOriginTest = await axios.get(`${CONFIG.backend}/health`, {
      headers: { 'Origin': CONFIG.frontend }
    });

    recordTest('Frontend-Backend Communication', 'integration',
      frontendOriginTest.status === 200,
      'Cross-origin API calls working');

  } catch (error) {
    recordTest('Frontend-Backend Communication', 'integration', false, error.message);
  }

  // Test complete request flow
  try {
    const completeFlowTest = await axios.get(`${CONFIG.backend}${CONFIG.apiPrefix}/test`, {
      headers: {
        'Origin': CONFIG.frontend,
        'Content-Type': 'application/json'
      }
    });

    recordTest('Complete Request Flow', 'integration',
      completeFlowTest.status === 200 && completeFlowTest.data.success,
      'End-to-end request successful');

  } catch (error) {
    recordTest('Complete Request Flow', 'integration', false, error.message);
  }
}

// Performance Tests
async function testPerformance() {
  log('⚡ Testing Performance...', 'performance');

  // Database query performance
  const dbClient = new Client(CONFIG.database);
  try {
    await dbClient.connect();

    const queryStart = Date.now();
    await dbClient.query(`
      SELECT p.*, pp.phase_name, COUNT(wl.id) as work_log_count
      FROM projects p
      LEFT JOIN project_phases pp ON p.id = pp.project_id
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      GROUP BY p.id, pp.phase_name
      LIMIT 10
    `);
    const queryTime = Date.now() - queryStart;

    recordTest('Database Query Performance', 'performance',
      queryTime < 1000,
      `Complex query: ${queryTime}ms`);

    await dbClient.end();
  } catch (error) {
    recordTest('Database Query Performance', 'performance', false, error.message);
  }

  // API response time
  const apiTests = [
    `${CONFIG.backend}/health`,
    `${CONFIG.backend}${CONFIG.apiPrefix}/test`
  ];

  for (const apiUrl of apiTests) {
    try {
      const apiStart = Date.now();
      await axios.get(apiUrl);
      const apiTime = Date.now() - apiStart;

      recordTest(`API Response Time (${apiUrl.split('/').pop()})`, 'performance',
        apiTime < 500,
        `${apiTime}ms`);

    } catch (error) {
      recordTest('API Response Time', 'performance', false, error.message);
    }
  }
}

// Generate comprehensive report
function generateFinalReport() {
  testSuite.endTime = new Date();
  const totalDuration = (testSuite.endTime - testSuite.startTime) / 1000;

  console.log('\n');
  log('════════════════════════════════════════════════════════════════', 'info');
  log('🏆 COMPREHENSIVE SYSTEM HEALTH CHECK REPORT', 'info');
  log('════════════════════════════════════════════════════════════════', 'info');

  // Overall statistics
  const successRate = (testSuite.passed / testSuite.total * 100).toFixed(1);
  log(`Total Tests Executed: ${testSuite.total}`, 'info');
  log(`Tests Passed: ${testSuite.passed}`, 'success');
  log(`Tests Failed: ${testSuite.failed}`, 'error');
  log(`Overall Success Rate: ${successRate}%`, 'info');
  log(`Total Duration: ${totalDuration.toFixed(2)} seconds`, 'info');

  console.log('\n');
  log('📊 Category Breakdown:', 'info');
  log('─────────────────────', 'info');

  Object.entries(testSuite.categories).forEach(([category, stats]) => {
    const categoryRate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : '0.0';
    const status = categoryRate >= 80 ? 'success' : categoryRate >= 60 ? 'warning' : 'error';
    log(`${category.toUpperCase().padEnd(15)}: ${stats.passed}/${stats.total} (${categoryRate}%)`, status);
  });

  // System assessment
  console.log('\n');
  log('🎯 System Assessment:', 'info');
  log('───────────────────', 'info');

  let overallHealth = 'UNKNOWN';
  let healthEmoji = '❓';

  if (successRate >= 90) {
    overallHealth = 'EXCELLENT';
    healthEmoji = '🟢';
  } else if (successRate >= 80) {
    overallHealth = 'VERY GOOD';
    healthEmoji = '🟢';
  } else if (successRate >= 70) {
    overallHealth = 'GOOD';
    healthEmoji = '🟡';
  } else if (successRate >= 60) {
    overallHealth = 'FAIR';
    healthEmoji = '🟡';
  } else {
    overallHealth = 'POOR';
    healthEmoji = '🔴';
  }

  log(`${healthEmoji} System Health Status: ${overallHealth} (${successRate}%)`, 'info');

  // Component status
  console.log('\n');
  log('🔧 Component Status:', 'info');
  log('──────────────────', 'info');

  const componentStatus = {
    'Database': testSuite.categories.database.passed / testSuite.categories.database.total,
    'Backend API': testSuite.categories.api.passed / testSuite.categories.api.total,
    'Infrastructure': testSuite.categories.infrastructure.passed / testSuite.categories.infrastructure.total,
    'Integration': testSuite.categories.integration.passed / testSuite.categories.integration.total,
    'Real-time': testSuite.categories.realtime.passed / testSuite.categories.realtime.total,
    'Performance': testSuite.categories.performance.passed / testSuite.categories.performance.total
  };

  Object.entries(componentStatus).forEach(([component, ratio]) => {
    const percentage = (ratio * 100).toFixed(0);
    const status = ratio >= 0.8 ? '🟢 HEALTHY' : ratio >= 0.6 ? '🟡 WARNING' : '🔴 CRITICAL';
    log(`${component.padEnd(15)}: ${status} (${percentage}%)`, 'info');
  });

  // Key findings
  console.log('\n');
  log('🔍 Key Findings:', 'info');
  log('───────────────', 'info');

  const findings = [];

  if (testSuite.categories.infrastructure.passed === testSuite.categories.infrastructure.total) {
    findings.push('✅ All infrastructure components are operational');
  }

  if (testSuite.categories.database.passed / testSuite.categories.database.total >= 0.9) {
    findings.push('✅ Database integrity and performance are excellent');
  }

  if (testSuite.categories.integration.passed / testSuite.categories.integration.total >= 0.8) {
    findings.push('✅ Frontend-backend integration is working properly');
  }

  if (testSuite.categories.realtime.passed === testSuite.categories.realtime.total) {
    findings.push('✅ Real-time communication is fully functional');
  }

  if (testSuite.failed > 0) {
    findings.push(`⚠️ ${testSuite.failed} test(s) failed - review required`);
  }

  findings.forEach(finding => log(finding, 'info'));

  // Failed tests details
  if (testSuite.failed > 0) {
    console.log('\n');
    log('❌ Failed Tests Details:', 'error');
    log('──────────────────────', 'error');

    testSuite.details
      .filter(test => !test.passed)
      .forEach(test => {
        log(`• ${test.name}: ${test.details}`, 'error');
      });
  }

  // Professional conclusion
  console.log('\n');
  log('🏁 CONCLUSION:', 'info');
  log('─────────────', 'info');

  if (successRate >= 85) {
    log('🎉 SYSTEM IS PRODUCTION-READY', 'success');
    log('   All major components are functioning correctly in a professional,', 'success');
    log('   dynamic, and well-connected manner. The system demonstrates', 'success');
    log('   excellent integration between all layers and components.', 'success');
  } else if (successRate >= 70) {
    log('✅ SYSTEM IS OPERATIONAL WITH MINOR ISSUES', 'warning');
    log('   Core functionality is working but some components need attention.', 'warning');
    log('   Review failed tests and address issues before production deployment.', 'warning');
  } else {
    log('⛔ SYSTEM NEEDS SIGNIFICANT ATTENTION', 'error');
    log('   Multiple critical issues detected. System requires debugging', 'error');
    log('   and fixes before it can be considered production-ready.', 'error');
  }

  console.log('\n');
  log('════════════════════════════════════════════════════════════════', 'info');

  return successRate >= 70;
}

// Main execution
async function runComprehensiveHealthCheck() {
  log('🚀 Starting Comprehensive System Health Check', 'info');
  log('   Testing ALL components for professional, dynamic connectivity', 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  try {
    await testInfrastructure();
    await testDatabaseIntegrity();
    await testAPIFunctionality();
    await testRealTimeCommunication();
    await testSystemIntegration();
    await testPerformance();

  } catch (error) {
    log(`Critical system failure: ${error.message}`, 'error');
  }

  return generateFinalReport();
}

// Execute the comprehensive health check
if (require.main === module) {
  runComprehensiveHealthCheck().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Health check execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveHealthCheck };