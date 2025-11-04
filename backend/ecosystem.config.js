module.exports = {
  apps: [{
    name: 'track-backend',
    script: './dist/app.js',

    // ====== AUTO-RESTART ON CRASH ======
    autorestart: true,                    // Automatically restart if app crashes
    max_restarts: 10,                     // Max restart attempts in time window
    min_uptime: '10s',                    // Minimum uptime before considered "started successfully"
    restart_delay: 2000,                  // Wait 2 seconds before restarting after crash
    exp_backoff_restart_delay: 100,       // Exponential backoff starting at 100ms

    // ====== CRASH HANDLING ======
    kill_timeout: 5000,                   // Force kill after 5 seconds if graceful shutdown fails
    listen_timeout: 3000,                 // Wait 3 seconds for app to bind to port
    wait_ready: false,                    // Don't wait for process.send('ready')

    // ====== PRODUCTION SETTINGS ======
    instances: 2,                         // Run 2 instances for high availability and zero downtime
    exec_mode: 'cluster',                 // Cluster mode for load balancing and crash resilience
    max_memory_restart: '1G',             // Restart if memory exceeds 1GB

    // ====== ENVIRONMENT ======
    env: {
      NODE_ENV: 'production',
    },

    // ====== MONITORING ======
    watch: false,                         // Don't watch files in production
    ignore_watch: ['node_modules', 'logs', 'backups', 'uploads'],

    // ====== LOGGING ======
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,                     // Merge logs from all instances

    // ====== ADDITIONAL CRASH RECOVERY ======
    // If app crashes more than 3 times in 1 minute, PM2 will wait 30 seconds before trying again
    min_restart_time: 60000,              // Time window for restart counting (1 minute)
    max_restarts_in_time: 3,              // Max restarts allowed in above time window
  }]
};
