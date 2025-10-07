/**
 * Simple Performance Test Server
 *
 * A minimal server to demonstrate the performance monitoring functionality
 * without TypeScript compilation issues.
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

class SimplePerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = Date.now();
    this.maxMetrics = 1000;
  }

  trackRequest = (req, res, next) => {
    const startTime = Date.now();
    this.requestCount++;

    const originalEnd = res.end;
    res.end = function(...args) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Store response time
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > 500) {
        this.responseTimes = this.responseTimes.slice(-500);
      }

      // Track errors
      if (res.statusCode >= 400) {
        this.errorCount++;
      }

      // Create metric
      const metric = {
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        memoryUsage: process.memoryUsage()
      };

      // Store metric
      this.addMetric(metric);

      // Log slow requests
      if (responseTime > 1000) {
        console.log(`🐌 Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
      }

      originalEnd.apply(res, args);
    }.bind(this);

    next();
  };

  addMetric(metric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getPerformanceStats() {
    if (this.responseTimes.length === 0) {
      return { message: 'No metrics available' };
    }

    const uptime = Date.now() - this.startTime;
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const average = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    const memUsage = process.memoryUsage();
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      systemInfo: {
        uptime: `${Math.floor(uptime / 1000)}s`,
        nodeVersion: process.version,
        pid: process.pid,
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: `${errorRate.toFixed(2)}%`,
      },
      responseTime: {
        average: `${average.toFixed(2)}ms`,
        p95: `${p95.toFixed(2)}ms`,
        p99: `${p99.toFixed(2)}ms`,
        min: `${Math.min(...sortedTimes)}ms`,
        max: `${Math.max(...sortedTimes)}ms`,
      },
      memory: {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        rss: this.formatBytes(memUsage.rss),
        external: this.formatBytes(memUsage.external),
      },
    };
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Create express app
const app = express();
const monitor = new SimplePerformanceMonitor();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests' }
});
app.use('/api', limiter);

// Performance monitoring middleware
app.use(monitor.trackRequest);

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Track Management System Performance Test Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      performance: {
        stats: '/performance/stats',
        health: '/performance/health'
      },
      api: '/api/test'
    }
  });
});

app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  res.json(health);
});

app.get('/performance/stats', (req, res) => {
  const stats = monitor.getPerformanceStats();
  res.json({
    success: true,
    data: stats
  });
});

app.get('/performance/health', (req, res) => {
  const stats = monitor.getPerformanceStats();
  const memUsage = process.memoryUsage();
  const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  let status = 'healthy';
  if (memoryPercentage > 90) {
    status = 'critical';
  } else if (memoryPercentage > 75) {
    status = 'warning';
  }

  const errorRate = parseFloat(stats.requests?.errorRate || '0');
  if (errorRate > 10) {
    status = 'critical';
  } else if (errorRate > 5) {
    status = 'warning';
  }

  const statusCode = status === 'critical' ? 503 : (status === 'warning' ? 207 : 200);

  res.status(statusCode).json({
    success: true,
    data: {
      status,
      timestamp: new Date(),
      metrics: {
        memory: {
          percentage: memoryPercentage,
          used: memUsage.heapUsed,
          total: memUsage.heapTotal
        },
        requests: {
          total: monitor.requestCount,
          errors: monitor.errorCount,
          errorRate
        }
      }
    }
  });
});

// API test endpoints
app.get('/api/test', (req, res) => {
  // Simulate some processing time
  const delay = Math.random() * 100; // 0-100ms delay
  setTimeout(() => {
    res.json({
      success: true,
      message: 'API test endpoint',
      timestamp: new Date().toISOString(),
      delay: `${delay.toFixed(2)}ms`
    });
  }, delay);
});

app.get('/api/slow', (req, res) => {
  // Simulate slow endpoint
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Slow endpoint for testing',
      timestamp: new Date().toISOString()
    });
  }, 1500); // 1.5 second delay
});

app.post('/api/data', (req, res) => {
  // Simulate data processing
  const items = req.body.items || [];
  setTimeout(() => {
    res.json({
      success: true,
      processed: items.length,
      timestamp: new Date().toISOString()
    });
  }, items.length * 10); // 10ms per item
});

// Error endpoint for testing
app.get('/api/error', (req, res) => {
  const random = Math.random();
  if (random < 0.3) {
    res.status(500).json({ success: false, error: 'Random server error' });
  } else if (random < 0.5) {
    res.status(404).json({ success: false, error: 'Resource not found' });
  } else {
    res.json({ success: true, message: 'No error this time!' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log('🚀 Performance Test Server Started');
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Performance: http://localhost:${PORT}/performance/stats`);
  console.log(`   Load test command: node backend/scripts/loadTest.js`);
  console.log('   Server ready for testing!');
});

module.exports = app;