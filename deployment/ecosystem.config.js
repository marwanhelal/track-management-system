module.exports = {
  apps: [{
    name: 'track-backend',
    cwd: '/var/www/track-management/backend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
    },
    instances: 2,
    exec_mode: 'cluster',

    // ====== AUTO-RESTART CONFIGURATION ======
    autorestart: true,              // Always restart on crash
    max_restarts: 10,               // Max restart attempts in time window
    min_uptime: '10s',              // Minimum uptime to be considered started successfully
    restart_delay: 4000,            // Wait 4 seconds before restart after crash
    exp_backoff_restart_delay: 100, // Exponential backoff: 100ms base delay

    // ====== CRASH RECOVERY SETTINGS ======
    kill_timeout: 5000,             // Force kill after 5 seconds if graceful shutdown fails
    listen_timeout: 3000,           // Wait 3 seconds for app to be ready
    wait_ready: false,              // Don't wait for process.send('ready')

    // ====== MEMORY MANAGEMENT ======
    max_memory_restart: '1G',       // Restart if memory exceeds 1GB

    // ====== MONITORING & LOGS ======
    watch: false,                   // Don't watch files in production
    error_file: '/var/log/pm2/track-backend-error.log',
    out_file: '/var/log/pm2/track-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // ====== HEALTH CHECK ======
    // PM2 will restart if health check fails
    health_check: {
      enable: true,
      interval: 30000,              // Check every 30 seconds
      url: 'http://localhost:5005/health',
      max_failures: 3,              // Restart after 3 failed health checks
    },
  }]
};
