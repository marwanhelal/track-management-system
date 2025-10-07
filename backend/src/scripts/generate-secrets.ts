import crypto from 'crypto';

/**
 * Generate Secure Secrets for Production Deployment
 *
 * This script generates cryptographically secure random secrets
 * for JWT tokens and other sensitive configuration
 */

console.log('\n🔐 Generating Secure Production Secrets\n');
console.log('=' .repeat(60));

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('\n1️⃣  JWT_SECRET (paste this in your .env file):');
console.log('─'.repeat(60));
console.log(jwtSecret);

// Generate JWT Refresh Secret
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('\n2️⃣  JWT_REFRESH_SECRET (paste this in your .env file):');
console.log('─'.repeat(60));
console.log(jwtRefreshSecret);

// Generate Database Password
const dbPassword = crypto.randomBytes(32).toString('base64').replace(/[/+=]/g, '');
console.log('\n3️⃣  DB_PASSWORD (strong database password):');
console.log('─'.repeat(60));
console.log(dbPassword);

// Generate Session Secret (if needed)
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('\n4️⃣  SESSION_SECRET (optional, for session management):');
console.log('─'.repeat(60));
console.log(sessionSecret);

console.log('\n' + '='.repeat(60));
console.log('\n📋 Copy these values to your production .env file');
console.log('⚠️  NEVER commit these secrets to Git!');
console.log('✅ Store them securely in a password manager\n');

// Generate example .env content
console.log('📝 Example .env configuration:\n');
console.log('─'.repeat(60));
console.log(`
NODE_ENV=production
PORT=10000

# Database Configuration
DB_HOST=your-db-host.render.com
DB_PORT=5432
DB_NAME=track_management
DB_USER=your_db_user
DB_PASSWORD=${dbPassword}
DB_SSL=true
DB_POOL_MIN=10
DB_POOL_MAX=100

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=https://your-app.vercel.app
CORS_CREDENTIALS=true

# Socket.IO
SOCKET_CORS_ORIGIN=https://your-app.vercel.app
`);
console.log('─'.repeat(60));
console.log('\n✨ Secrets generated successfully!\n');
