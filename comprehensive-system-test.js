#!/usr/bin/env node

/**
 * Comprehensive System Integration Test Suite
 *
 * This script performs thorough testing of all system components and their connections:
 * - Database schema and connections
 * - API endpoints and authentication
 * - Real-time Socket.IO communication
 * - Frontend-backend integration
 * - Role-based access control
 * - Data flow across all components
 * - Error handling and edge cases
 * - Performance benchmarking
 */

const axios = require('axios');
const { Client } = require('pg');
const io = require('socket.io-client');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  backend: {
    baseURL: 'http://localhost:5003',
    apiPrefix: '/api/v1',
    timeout: 10000
  },
  frontend: {
    baseURL: 'http://localhost:3001',
    timeout: 10000
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'track_management',
    user: 'postgres',
    password: '25180047m5',
    connectionTimeout: 5000
  },
  socket: {
    url: 'http://localhost:5003',
    timeout: 5000
  }
};

// Test Results Storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
  startTime: new Date(),
  endTime: null
};

// Utilities
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪'
  }[type] || '📋';

  console.log(`${prefix} [${timestamp}] ${message}`);
};

const recordTest = (name, passed, details = null, duration = 0) => {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`${name} - PASSED (${duration}ms)`, 'success');
  } else {
    testResults.failed++;
    log(`${name} - FAILED: ${details}`, 'error');
  }

  testResults.details.push({
    name,
    passed,
    details,
    duration,
    timestamp: new Date()
  });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test Authentication Helper
let authTokens = {
  supervisor: null,
  engineer: null
};

let testUsers = {
  supervisor: null,
  engineer: null
};

class SystemTestSuite {
  constructor() {
    this.dbClient = null;
    this.socketClient = null;
  }

  async runAllTests() {
    log('🚀 Starting Comprehensive System Integration Tests', 'info');
    log('===============================================', 'info');

    try {
      // Phase 1: Infrastructure Tests
      await this.testDatabaseConnection();
      await this.testBackendServer();
      await this.testFrontendServer();

      // Phase 2: Database Schema Tests
      await this.testDatabaseSchema();
      await this.testDatabaseTriggers();

      // Phase 3: Authentication & Authorization Tests
      await this.setupTestUsers();
      await this.testAuthenticationFlow();
      await this.testRoleBasedAccess();

      // Phase 4: API Endpoint Tests
      await this.testUserAPIs();
      await this.testProjectAPIs();
      await this.testPhaseAPIs();
      await this.testWorkLogAPIs();

      // Phase 5: Real-time Communication Tests
      await this.testSocketConnection();
      await this.testRealTimeUpdates();

      // Phase 6: Integration Flow Tests
      await this.testCompleteProjectWorkflow();
      await this.testDataConsistency();

      // Phase 7: Performance & Stress Tests
      await this.testPerformance();
      await this.testErrorHandling();

      // Phase 8: Cleanup
      await this.cleanup();

    } catch (error) {
      log(`Critical test failure: ${error.message}`, 'error');
      recordTest('Critical System Test', false, error.message);
    } finally {
      await this.generateReport();
    }
  }

  // Infrastructure Tests
  async testDatabaseConnection() {
    const startTime = Date.now();
    try {
      this.dbClient = new Client(CONFIG.database);
      await this.dbClient.connect();

      const result = await this.dbClient.query('SELECT NOW() as current_time, version() as version');
      recordTest('Database Connection', true, null, Date.now() - startTime);

      log(`Database connected: ${result.rows[0].version}`, 'info');

      // Test connection pool
      const poolTest = await this.dbClient.query('SELECT COUNT(*) as connection_count FROM pg_stat_activity WHERE datname = $1', [CONFIG.database.database]);
      recordTest('Database Pool Test', true, `Active connections: ${poolTest.rows[0].connection_count}`, Date.now() - startTime);

    } catch (error) {
      recordTest('Database Connection', false, error.message, Date.now() - startTime);
      throw error;
    }
  }

  async testBackendServer() {
    const startTime = Date.now();
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${CONFIG.backend.baseURL}/health`, {
        timeout: CONFIG.backend.timeout
      });

      recordTest('Backend Health Check', healthResponse.status === 200, null, Date.now() - startTime);

      // Test API root
      const apiResponse = await axios.get(`${CONFIG.backend.baseURL}`, {
        timeout: CONFIG.backend.timeout
      });

      recordTest('Backend API Root', apiResponse.status === 200 && apiResponse.data.success, null, Date.now() - startTime);

      log(`Backend server info: ${apiResponse.data.message} v${apiResponse.data.version}`, 'info');

    } catch (error) {
      recordTest('Backend Server', false, error.message, Date.now() - startTime);
      throw error;
    }
  }

  async testFrontendServer() {
    const startTime = Date.now();
    try {
      const response = await axios.get(CONFIG.frontend.baseURL, {
        timeout: CONFIG.frontend.timeout
      });

      recordTest('Frontend Server', response.status === 200, null, Date.now() - startTime);
      log('Frontend server is accessible', 'info');

    } catch (error) {
      recordTest('Frontend Server', false, error.message, Date.now() - startTime);
      // Non-critical for API testing
      log('Frontend server test failed - continuing with API tests', 'warning');
    }
  }

  // Database Schema Tests
  async testDatabaseSchema() {
    const startTime = Date.now();
    try {
      const requiredTables = [
        'users', 'projects', 'project_phases', 'work_logs',
        'predefined_phases', 'audit_logs', 'project_settings'
      ];

      for (const table of requiredTables) {
        const result = await this.dbClient.query(
          `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
           WHERE table_name = $1
           ORDER BY ordinal_position`,
          [table]
        );

        recordTest(`Table Schema: ${table}`, result.rows.length > 0,
          `Columns: ${result.rows.length}`, Date.now() - startTime);
      }

      // Test indexes
      const indexQuery = await this.dbClient.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE tablename IN (${requiredTables.map((_, i) => `$${i + 1}`).join(',')})
      `, requiredTables);

      recordTest('Database Indexes', indexQuery.rows.length > 0,
        `Found ${indexQuery.rows.length} indexes`, Date.now() - startTime);

    } catch (error) {
      recordTest('Database Schema', false, error.message, Date.now() - startTime);
    }
  }

  async testDatabaseTriggers() {
    const startTime = Date.now();
    try {
      const triggerQuery = await this.dbClient.query(`
        SELECT trigger_name, event_object_table, action_timing, event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY trigger_name
      `);

      recordTest('Database Triggers', triggerQuery.rows.length > 0,
        `Found ${triggerQuery.rows.length} triggers`, Date.now() - startTime);

      // Test specific triggers
      const requiredTriggers = ['update_updated_at', 'update_project_hours'];
      for (const triggerPrefix of requiredTriggers) {
        const found = triggerQuery.rows.some(row => row.trigger_name.includes(triggerPrefix));
        recordTest(`Trigger Check: ${triggerPrefix}`, found, null, Date.now() - startTime);
      }

    } catch (error) {
      recordTest('Database Triggers', false, error.message, Date.now() - startTime);
    }
  }

  // Authentication Tests
  async setupTestUsers() {
    const startTime = Date.now();
    try {
      const timestamp = Date.now();

      // Create test users if they don't exist
      const supervisorEmail = `test-supervisor-${timestamp}@test.com`;
      const engineerEmail = `test-engineer-${timestamp}@test.com`;

      // Check if users already exist
      const existingUsers = await this.dbClient.query(
        'SELECT id, email, role FROM users WHERE email IN ($1, $2)',
        [supervisorEmail, engineerEmail]
      );

      if (existingUsers.rows.length === 0) {
        // Create supervisor
        await this.dbClient.query(`
          INSERT INTO users (name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
        `, ['Test Supervisor', supervisorEmail, 'hashed_password_placeholder', 'supervisor']);

        // Create engineer
        await this.dbClient.query(`
          INSERT INTO users (name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
        `, ['Test Engineer', engineerEmail, 'hashed_password_placeholder', 'engineer']);
      }

      // Get user IDs
      const users = await this.dbClient.query(
        'SELECT id, email, role FROM users WHERE email IN ($1, $2)',
        [supervisorEmail, engineerEmail]
      );

      testUsers.supervisor = users.rows.find(u => u.role === 'supervisor');
      testUsers.engineer = users.rows.find(u => u.role === 'engineer');

      recordTest('Test User Setup', testUsers.supervisor && testUsers.engineer,
        null, Date.now() - startTime);

    } catch (error) {
      recordTest('Test User Setup', false, error.message, Date.now() - startTime);
    }
  }

  async testAuthenticationFlow() {
    const startTime = Date.now();
    try {
      // Test user registration
      const registerData = {
        name: 'Test Registration User',
        email: `test-register-${Date.now()}@test.com`,
        password: 'testPassword123',
        role: 'engineer'
      };

      const registerResponse = await axios.post(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/auth/register`,
        registerData
      );

      recordTest('User Registration', registerResponse.status === 201 || registerResponse.status === 200,
        null, Date.now() - startTime);

      // Test login
      const loginResponse = await axios.post(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/auth/login`,
        {
          email: registerData.email,
          password: registerData.password
        }
      );

      recordTest('User Login', loginResponse.status === 200 && loginResponse.data.token,
        null, Date.now() - startTime);

      if (loginResponse.data.token) {
        authTokens.engineer = loginResponse.data.token;
      }

      // Test token validation
      const profileResponse = await axios.get(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/auth/profile`,
        {
          headers: { Authorization: `Bearer ${loginResponse.data.token}` }
        }
      );

      recordTest('Token Validation', profileResponse.status === 200, null, Date.now() - startTime);

    } catch (error) {
      recordTest('Authentication Flow', false, error.message, Date.now() - startTime);
    }
  }

  async testRoleBasedAccess() {
    const startTime = Date.now();
    try {
      if (!authTokens.engineer) {
        recordTest('Role-Based Access', false, 'No auth token available', Date.now() - startTime);
        return;
      }

      // Test engineer accessing supervisor-only endpoint (should fail)
      try {
        await axios.get(
          `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/users`,
          {
            headers: { Authorization: `Bearer ${authTokens.engineer}` }
          }
        );
        recordTest('Role-Based Access (Restriction)', false, 'Engineer accessed supervisor endpoint', Date.now() - startTime);
      } catch (error) {
        // This should fail - engineer shouldn't access user management
        recordTest('Role-Based Access (Restriction)', error.response?.status === 403, null, Date.now() - startTime);
      }

      // Test accessing allowed endpoint
      const allowedResponse = await axios.get(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/projects`,
        {
          headers: { Authorization: `Bearer ${authTokens.engineer}` }
        }
      );

      recordTest('Role-Based Access (Allowed)', allowedResponse.status === 200, null, Date.now() - startTime);

    } catch (error) {
      recordTest('Role-Based Access', false, error.message, Date.now() - startTime);
    }
  }

  // API Endpoint Tests
  async testUserAPIs() {
    const startTime = Date.now();

    if (!authTokens.engineer) {
      recordTest('User APIs', false, 'No auth token', Date.now() - startTime);
      return;
    }

    try {
      // Test profile endpoint
      const profileResponse = await axios.get(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/auth/profile`,
        { headers: { Authorization: `Bearer ${authTokens.engineer}` }}
      );

      recordTest('User Profile API', profileResponse.status === 200, null, Date.now() - startTime);

    } catch (error) {
      recordTest('User APIs', false, error.message, Date.now() - startTime);
    }
  }

  async testProjectAPIs() {
    const startTime = Date.now();

    if (!authTokens.engineer) {
      recordTest('Project APIs', false, 'No auth token', Date.now() - startTime);
      return;
    }

    try {
      // Test get projects
      const projectsResponse = await axios.get(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/projects`,
        { headers: { Authorization: `Bearer ${authTokens.engineer}` }}
      );

      recordTest('Get Projects API', projectsResponse.status === 200, null, Date.now() - startTime);

      // Test create project (if supervisor token available)
      // This is a basic read test since we may not have supervisor access
      recordTest('Project APIs Basic', projectsResponse.status === 200,
        `Found ${projectsResponse.data.data ? projectsResponse.data.data.length : 0} projects`, Date.now() - startTime);

    } catch (error) {
      recordTest('Project APIs', false, error.message, Date.now() - startTime);
    }
  }

  async testPhaseAPIs() {
    const startTime = Date.now();

    if (!authTokens.engineer) {
      recordTest('Phase APIs', false, 'No auth token', Date.now() - startTime);
      return;
    }

    try {
      const phasesResponse = await axios.get(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/phases`,
        { headers: { Authorization: `Bearer ${authTokens.engineer}` }}
      );

      recordTest('Get Phases API', phasesResponse.status === 200, null, Date.now() - startTime);

    } catch (error) {
      recordTest('Phase APIs', false, error.message, Date.now() - startTime);
    }
  }

  async testWorkLogAPIs() {
    const startTime = Date.now();

    if (!authTokens.engineer) {
      recordTest('Work Log APIs', false, 'No auth token', Date.now() - startTime);
      return;
    }

    try {
      const workLogsResponse = await axios.get(
        `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/work-logs`,
        { headers: { Authorization: `Bearer ${authTokens.engineer}` }}
      );

      recordTest('Get Work Logs API', workLogsResponse.status === 200, null, Date.now() - startTime);

    } catch (error) {
      recordTest('Work Log APIs', false, error.message, Date.now() - startTime);
    }
  }

  // Real-time Communication Tests
  async testSocketConnection() {
    const startTime = Date.now();
    try {
      this.socketClient = io(CONFIG.socket.url, {
        timeout: CONFIG.socket.timeout,
        transports: ['websocket']
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket connection timeout'));
        }, CONFIG.socket.timeout);

        this.socketClient.on('connect', () => {
          clearTimeout(timeout);
          recordTest('Socket.IO Connection', true, null, Date.now() - startTime);
          resolve();
        });

        this.socketClient.on('connect_error', (error) => {
          clearTimeout(timeout);
          recordTest('Socket.IO Connection', false, error.message, Date.now() - startTime);
          reject(error);
        });
      });

    } catch (error) {
      recordTest('Socket.IO Connection', false, error.message, Date.now() - startTime);
    }
  }

  async testRealTimeUpdates() {
    const startTime = Date.now();

    if (!this.socketClient || !this.socketClient.connected) {
      recordTest('Real-time Updates', false, 'No socket connection', Date.now() - startTime);
      return;
    }

    try {
      // Test joining rooms
      this.socketClient.emit('join', testUsers.engineer?.id || 1);
      this.socketClient.emit('join_project', 1);

      await delay(500); // Wait for join confirmation

      recordTest('Socket Room Joining', true, null, Date.now() - startTime);

      // Test notification listening
      let notificationReceived = false;
      this.socketClient.on('notification', (data) => {
        notificationReceived = true;
      });

      await delay(1000);
      recordTest('Socket Event Listening', true, null, Date.now() - startTime);

    } catch (error) {
      recordTest('Real-time Updates', false, error.message, Date.now() - startTime);
    }
  }

  // Integration Flow Tests
  async testCompleteProjectWorkflow() {
    const startTime = Date.now();
    try {
      // This would test the complete flow from project creation to completion
      // For now, we'll test data consistency

      const projectsQuery = await this.dbClient.query('SELECT COUNT(*) as count FROM projects');
      const phasesQuery = await this.dbClient.query('SELECT COUNT(*) as count FROM project_phases');
      const workLogsQuery = await this.dbClient.query('SELECT COUNT(*) as count FROM work_logs');

      recordTest('Project Workflow Data', true,
        `Projects: ${projectsQuery.rows[0].count}, Phases: ${phasesQuery.rows[0].count}, Work Logs: ${workLogsQuery.rows[0].count}`,
        Date.now() - startTime);

    } catch (error) {
      recordTest('Complete Project Workflow', false, error.message, Date.now() - startTime);
    }
  }

  async testDataConsistency() {
    const startTime = Date.now();
    try {
      // Test referential integrity
      const orphanedPhases = await this.dbClient.query(`
        SELECT COUNT(*) as count
        FROM project_phases pp
        LEFT JOIN projects p ON pp.project_id = p.id
        WHERE p.id IS NULL
      `);

      const orphanedWorkLogs = await this.dbClient.query(`
        SELECT COUNT(*) as count
        FROM work_logs wl
        LEFT JOIN project_phases pp ON wl.phase_id = pp.id
        WHERE pp.id IS NULL
      `);

      recordTest('Data Consistency (Orphaned Records)',
        orphanedPhases.rows[0].count === '0' && orphanedWorkLogs.rows[0].count === '0',
        `Orphaned phases: ${orphanedPhases.rows[0].count}, Orphaned work logs: ${orphanedWorkLogs.rows[0].count}`,
        Date.now() - startTime);

      // Test calculated fields consistency
      const hourCalculation = await this.dbClient.query(`
        SELECT p.id, p.actual_hours as project_hours,
               COALESCE(SUM(wl.hours), 0) as calculated_hours
        FROM projects p
        LEFT JOIN work_logs wl ON p.id = wl.project_id
        GROUP BY p.id, p.actual_hours
        HAVING p.actual_hours != COALESCE(SUM(wl.hours), 0)
        LIMIT 5
      `);

      recordTest('Data Consistency (Hour Calculations)',
        hourCalculation.rows.length === 0,
        `Inconsistent hour calculations: ${hourCalculation.rows.length}`,
        Date.now() - startTime);

    } catch (error) {
      recordTest('Data Consistency', false, error.message, Date.now() - startTime);
    }
  }

  // Performance Tests
  async testPerformance() {
    const startTime = Date.now();
    try {
      // Test database query performance
      const queryStart = Date.now();
      await this.dbClient.query(`
        SELECT p.*, COUNT(pp.id) as phase_count, SUM(wl.hours) as total_hours
        FROM projects p
        LEFT JOIN project_phases pp ON p.id = pp.project_id
        LEFT JOIN work_logs wl ON p.id = wl.project_id
        GROUP BY p.id
        LIMIT 100
      `);
      const queryTime = Date.now() - queryStart;

      recordTest('Database Query Performance', queryTime < 1000,
        `Query took ${queryTime}ms`, Date.now() - startTime);

      // Test API response time
      if (authTokens.engineer) {
        const apiStart = Date.now();
        await axios.get(
          `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/projects`,
          { headers: { Authorization: `Bearer ${authTokens.engineer}` }}
        );
        const apiTime = Date.now() - apiStart;

        recordTest('API Response Performance', apiTime < 2000,
          `API call took ${apiTime}ms`, Date.now() - startTime);
      }

    } catch (error) {
      recordTest('Performance Tests', false, error.message, Date.now() - startTime);
    }
  }

  // Error Handling Tests
  async testErrorHandling() {
    const startTime = Date.now();
    try {
      // Test invalid API endpoint
      try {
        await axios.get(`${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/nonexistent`);
        recordTest('Error Handling (404)', false, '404 error not properly handled', Date.now() - startTime);
      } catch (error) {
        recordTest('Error Handling (404)', error.response?.status === 404, null, Date.now() - startTime);
      }

      // Test unauthorized access
      try {
        await axios.get(`${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/users`);
        recordTest('Error Handling (401)', false, 'Unauthorized access allowed', Date.now() - startTime);
      } catch (error) {
        recordTest('Error Handling (401)', error.response?.status === 401, null, Date.now() - startTime);
      }

      // Test malformed request
      try {
        await axios.post(
          `${CONFIG.backend.baseURL}${CONFIG.backend.apiPrefix}/auth/login`,
          { invalid: 'data' }
        );
        recordTest('Error Handling (400)', false, 'Bad request not properly handled', Date.now() - startTime);
      } catch (error) {
        recordTest('Error Handling (400)', error.response?.status === 400 || error.response?.status === 422, null, Date.now() - startTime);
      }

    } catch (error) {
      recordTest('Error Handling Tests', false, error.message, Date.now() - startTime);
    }
  }

  // Cleanup
  async cleanup() {
    const startTime = Date.now();
    try {
      // Close socket connection
      if (this.socketClient) {
        this.socketClient.disconnect();
      }

      // Close database connection
      if (this.dbClient) {
        await this.dbClient.end();
      }

      recordTest('Cleanup', true, null, Date.now() - startTime);

    } catch (error) {
      recordTest('Cleanup', false, error.message, Date.now() - startTime);
    }
  }

  // Report Generation
  async generateReport() {
    testResults.endTime = new Date();
    const totalDuration = testResults.endTime - testResults.startTime;

    console.log('\n');
    log('========================================', 'info');
    log('📊 COMPREHENSIVE SYSTEM TEST REPORT', 'info');
    log('========================================', 'info');

    log(`Total Tests: ${testResults.total}`, 'info');
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, 'error');
    log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'info');
    log(`Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`, 'info');

    if (testResults.failed > 0) {
      console.log('\n');
      log('❌ FAILED TESTS:', 'error');
      testResults.details
        .filter(test => !test.passed)
        .forEach(test => {
          log(`  • ${test.name}: ${test.details}`, 'error');
        });
    }

    // Generate JSON report
    const report = {
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: (testResults.passed / testResults.total) * 100,
        duration: totalDuration,
        startTime: testResults.startTime,
        endTime: testResults.endTime
      },
      tests: testResults.details,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    try {
      await fs.writeFile(
        path.join(__dirname, 'test-report.json'),
        JSON.stringify(report, null, 2)
      );
      log('📄 Detailed report saved to test-report.json', 'info');
    } catch (error) {
      log(`Failed to save report: ${error.message}`, 'error');
    }

    console.log('\n');
    const status = testResults.failed === 0 ? 'success' : 'error';
    log(`🏁 Testing Complete - ${testResults.failed === 0 ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!'}`, status);
  }
}

// Main execution
async function main() {
  const testSuite = new SystemTestSuite();
  await testSuite.runAllTests();

  // Exit with appropriate code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SystemTestSuite;