// Script to run settings-related database migrations
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,
});

async function runMigration(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📝 Running migration: ${fileName}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ Migration completed: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${fileName}`);
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting settings migrations...');
  console.log('=====================================\n');

  const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');
  const migrations = [
    path.join(migrationsDir, '001_create_user_preferences.sql'),
    path.join(migrationsDir, '002_create_user_notification_settings.sql'),
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migrationPath of migrations) {
    if (fs.existsSync(migrationPath)) {
      const success = await runMigration(migrationPath);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      failCount++;
    }
  }

  console.log('\n=====================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('=====================================\n');

  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
