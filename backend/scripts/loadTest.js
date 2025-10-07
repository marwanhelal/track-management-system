/**
 * Simple Load Testing Script for Track Management System
 *
 * This script performs basic load testing against the API to verify
 * performance optimizations and identify bottlenecks.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class LoadTester {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:5010';
    this.concurrency = config.concurrency || 10;
    this.duration = config.duration || 30; // seconds
    this.warmupTime = config.warmupTime || 5; // seconds
    this.reportInterval = config.reportInterval || 5; // seconds

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: {},
      statusCodes: {},
      startTime: null,
      endTime: null
    };

    this.activeRequests = 0;
    this.isRunning = false;
  }

  // Test scenarios
  getTestScenarios() {
    return [
      {
        name: 'Health Check',
        weight: 10,
        endpoint: '/health',
        method: 'GET'
      },
      {
        name: 'Performance Stats',
        weight: 5,
        endpoint: '/performance/stats',
        method: 'GET'
      },
      {
        name: 'API Root',
        weight: 15,
        endpoint: '/',
        method: 'GET'
      },
      {
        name: 'API Test Endpoint',
        weight: 20,
        endpoint: '/api/v1/test',
        method: 'GET'
      },
      // Add authenticated endpoints if auth token is available
      {
        name: 'Projects List (Mock)',
        weight: 25,
        endpoint: '/api/v1/projects',
        method: 'GET',
        skipAuth: true // Will result in 401, but tests performance
      },
      {
        name: 'Users List (Mock)',
        weight: 15,
        endpoint: '/api/v1/users',
        method: 'GET',
        skipAuth: true // Will result in 401, but tests performance
      },
      {
        name: 'Work Logs (Mock)',
        weight: 10,
        endpoint: '/api/v1/work-logs',
        method: 'GET',
        skipAuth: true // Will result in 401, but tests performance
      }
    ];
  }

  // Weighted random selection of test scenarios
  selectRandomScenario() {
    const scenarios = this.getTestScenarios();
    const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
    let random = Math.random() * totalWeight;

    for (const scenario of scenarios) {
      random -= scenario.weight;
      if (random <= 0) {
        return scenario;
      }
    }

    return scenarios[0]; // Fallback
  }

  // Make HTTP request
  makeRequest(scenario) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = new URL(scenario.endpoint, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: scenario.method,
        headers: {
          'User-Agent': 'LoadTester/1.0',
          'Accept': 'application/json',
          'Connection': 'keep-alive'
        },
        timeout: 10000 // 10 second timeout
      };

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          resolve({
            scenario: scenario.name,
            statusCode: res.statusCode,
            responseTime,
            success: res.statusCode < 400 || (scenario.skipAuth && res.statusCode === 401),
            error: null,
            responseSize: data.length
          });
        });
      });

      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        resolve({
          scenario: scenario.name,
          statusCode: 0,
          responseTime,
          success: false,
          error: error.message,
          responseSize: 0
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        resolve({
          scenario: scenario.name,
          statusCode: 0,
          responseTime,
          success: false,
          error: 'Request timeout',
          responseSize: 0
        });
      });

      req.end();
    });
  }

  // Record request result
  recordResult(result) {
    this.stats.totalRequests++;

    if (result.success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    this.stats.responseTimes.push(result.responseTime);

    // Track status codes
    const statusKey = result.statusCode.toString();
    this.stats.statusCodes[statusKey] = (this.stats.statusCodes[statusKey] || 0) + 1;

    // Track errors
    if (result.error) {
      this.stats.errors[result.error] = (this.stats.errors[result.error] || 0) + 1;
    }
  }

  // Calculate percentiles
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  // Generate statistics report
  generateReport() {
    const { responseTimes, totalRequests, successfulRequests, failedRequests } = this.stats;
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;

    const report = {
      summary: {
        duration: `${duration.toFixed(2)}s`,
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? `${((successfulRequests / totalRequests) * 100).toFixed(2)}%` : '0%',
        requestsPerSecond: `${(totalRequests / duration).toFixed(2)}`
      },
      performance: {
        averageResponseTime: responseTimes.length > 0 ? `${(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)}ms` : '0ms',
        minResponseTime: responseTimes.length > 0 ? `${Math.min(...responseTimes)}ms` : '0ms',
        maxResponseTime: responseTimes.length > 0 ? `${Math.max(...responseTimes)}ms` : '0ms',
        p50: responseTimes.length > 0 ? `${this.calculatePercentile(responseTimes, 50)}ms` : '0ms',
        p95: responseTimes.length > 0 ? `${this.calculatePercentile(responseTimes, 95)}ms` : '0ms',
        p99: responseTimes.length > 0 ? `${this.calculatePercentile(responseTimes, 99)}ms` : '0ms'
      },
      statusCodes: this.stats.statusCodes,
      errors: this.stats.errors
    };

    return report;
  }

  // Print live statistics
  printLiveStats() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rps = this.stats.totalRequests / elapsed;
    const successRate = this.stats.totalRequests > 0 ?
      ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) : '0';

    console.log(`\n📊 Live Stats (${elapsed.toFixed(1)}s elapsed):`);
    console.log(`   Requests: ${this.stats.totalRequests} | Success: ${successRate}% | RPS: ${rps.toFixed(1)} | Active: ${this.activeRequests}`);

    if (this.stats.responseTimes.length > 0) {
      const recent = this.stats.responseTimes.slice(-100); // Last 100 requests
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      console.log(`   Avg Response Time: ${avgRecent.toFixed(1)}ms | Min: ${Math.min(...recent)}ms | Max: ${Math.max(...recent)}ms`);
    }
  }

  // Worker function that continuously makes requests
  async worker() {
    while (this.isRunning) {
      if (this.activeRequests < this.concurrency) {
        this.activeRequests++;

        const scenario = this.selectRandomScenario();

        try {
          const result = await this.makeRequest(scenario);
          this.recordResult(result);
        } catch (error) {
          this.recordResult({
            scenario: 'unknown',
            statusCode: 0,
            responseTime: 0,
            success: false,
            error: error.message,
            responseSize: 0
          });
        }

        this.activeRequests--;
      } else {
        // Small delay if we've hit concurrency limit
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  // Run load test
  async run() {
    console.log('🚀 Starting Load Test');
    console.log(`   Target: ${this.baseUrl}`);
    console.log(`   Concurrency: ${this.concurrency}`);
    console.log(`   Duration: ${this.duration}s`);
    console.log(`   Warmup: ${this.warmupTime}s`);

    // Reset stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: {},
      statusCodes: {},
      startTime: Date.now(),
      endTime: null
    };

    this.isRunning = true;

    // Start workers
    const workers = [];
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.worker());
    }

    // Live stats reporting
    const statsInterval = setInterval(() => {
      if (this.isRunning) {
        this.printLiveStats();
      }
    }, this.reportInterval * 1000);

    // Warmup period
    console.log('\n🔥 Warming up...');
    await new Promise(resolve => setTimeout(resolve, this.warmupTime * 1000));

    // Reset stats after warmup
    this.stats.totalRequests = 0;
    this.stats.successfulRequests = 0;
    this.stats.failedRequests = 0;
    this.stats.responseTimes = [];
    this.stats.errors = {};
    this.stats.statusCodes = {};
    this.stats.startTime = Date.now();

    console.log('\n⚡ Starting actual test...');

    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, this.duration * 1000));

    // Stop test
    this.isRunning = false;
    this.stats.endTime = Date.now();
    clearInterval(statsInterval);

    // Wait for all workers to finish
    await Promise.all(workers);

    console.log('\n✅ Load test completed!');

    // Generate and display final report
    const report = this.generateReport();

    console.log('\n📈 Final Report:');
    console.log('================');
    console.log(JSON.stringify(report, null, 2));

    // Save report to file
    const reportFile = path.join(__dirname, '..', 'logs', `load-test-${Date.now()}.json`);
    try {
      const logsDir = path.dirname(reportFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: ${reportFile}`);
    } catch (error) {
      console.log(`\n⚠️ Could not save report: ${error.message}`);
    }

    return report;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      if (['concurrency', 'duration', 'warmupTime', 'reportInterval'].includes(key)) {
        config[key] = parseInt(value, 10);
      } else {
        config[key] = value;
      }
    }
  }

  console.log('🧪 Track Management System Load Tester');
  console.log('======================================');

  const tester = new LoadTester(config);

  tester.run().then(report => {
    console.log('\n🎯 Test completed successfully!');

    // Exit with appropriate code
    const successRate = parseFloat(report.summary.successRate);
    const avgResponseTime = parseFloat(report.performance.averageResponseTime);

    if (successRate < 95 || avgResponseTime > 1000) {
      console.log('\n⚠️ Performance issues detected - check the report for details');
      process.exit(1);
    } else {
      console.log('\n✅ Performance looks good!');
      process.exit(0);
    }
  }).catch(error => {
    console.error('\n❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = LoadTester;