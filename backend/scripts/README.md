# Performance Testing Scripts

This directory contains scripts for testing and monitoring the performance of the Track Management System.

## Load Testing

### Basic Usage

```bash
# Run basic load test
node loadTest.js

# Custom configuration
node loadTest.js --baseUrl http://localhost:5010 --concurrency 20 --duration 60

# Production testing
node loadTest.js --baseUrl https://your-production-url.com --concurrency 50 --duration 120
```

### Parameters

- `--baseUrl`: Target server URL (default: http://localhost:5010)
- `--concurrency`: Number of concurrent requests (default: 10)
- `--duration`: Test duration in seconds (default: 30)
- `--warmupTime`: Warmup period in seconds (default: 5)
- `--reportInterval`: Live stats interval in seconds (default: 5)

### Test Scenarios

The load tester includes weighted scenarios:

- Health Check (10% of requests)
- Performance Stats (5% of requests)
- API Root (15% of requests)
- API Test Endpoint (20% of requests)
- Projects List Mock (25% of requests)
- Users List Mock (15% of requests)
- Work Logs Mock (10% of requests)

### Performance Monitoring Endpoints

Before running load tests, you can check the current system performance:

```bash
# System health
curl http://localhost:5010/performance/health

# Performance statistics
curl http://localhost:5010/performance/stats

# Specific endpoint metrics
curl http://localhost:5010/performance/endpoints/%2Fapi%2Fv1%2Fprojects
```

### Interpreting Results

The load tester provides comprehensive metrics:

- **Success Rate**: Should be >95% for healthy systems
- **Average Response Time**: Should be <500ms for good performance
- **P95/P99**: 95th and 99th percentile response times
- **Requests Per Second**: System throughput

### Performance Benchmarks

For a system with optimizations applied:

- **Good Performance**: >95% success rate, <200ms avg response time
- **Acceptable Performance**: >90% success rate, <500ms avg response time
- **Poor Performance**: <90% success rate, >1000ms avg response time

## Usage Examples

### Development Testing
```bash
# Quick test during development
node loadTest.js --concurrency 5 --duration 15
```

### Production Readiness Test
```bash
# Stress test for production
node loadTest.js --concurrency 100 --duration 300 --baseUrl https://production-url.com
```

### Continuous Integration
```bash
# CI/CD pipeline test
node loadTest.js --concurrency 10 --duration 30
# Exits with code 1 if performance is poor
```

## Report Output

Results are saved to `../logs/load-test-[timestamp].json` and include:

- Summary statistics
- Performance metrics
- Status code distribution
- Error analysis
- Percentile breakdowns

## Monitoring Integration

The performance monitoring service automatically tracks:

- Request/response times
- Memory usage
- CPU utilization
- Database performance
- Cache hit rates
- Error rates

Access monitoring data at:
- `/performance/stats` - Current system statistics
- `/performance/health` - System health status
- `/performance/endpoints/{endpoint}` - Specific endpoint metrics