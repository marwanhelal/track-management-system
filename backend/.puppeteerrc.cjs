/**
 * Puppeteer configuration for production deployment
 * Skip Chromium download - use system Chromium instead
 */
module.exports = {
  // Skip downloading Chromium during npm install
  skipDownload: true,

  // Use system Chromium (installed via apt or docker)
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',

  // Default launch args for headless mode
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--headless'
  ]
};
