const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25180047m5',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Add administrator role...');

    // Step 1: Add job_description column
    console.log('Step 1: Adding job_description column...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS job_description VARCHAR(100);
    `);
    console.log('✓ job_description column added');

    // Step 2: Drop old constraint
    console.log('Step 2: Dropping old role constraint...');
    await client.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    console.log('✓ Old constraint dropped');

    // Step 3: Add new constraint with administrator
    console.log('Step 3: Adding new role constraint...');
    await client.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('supervisor', 'engineer', 'administrator'));
    `);
    console.log('✓ New constraint added (supervisor, engineer, administrator)');

    // Step 4: Update existing users with default job descriptions
    console.log('Step 4: Updating existing users with default job descriptions...');
    await client.query(`
      UPDATE users
      SET job_description = CASE
          WHEN role = 'supervisor' THEN 'Manager'
          WHEN role = 'engineer' THEN 'Engineer'
          ELSE job_description
      END
      WHERE job_description IS NULL;
    `);
    console.log('✓ Existing users updated');

    // Step 5: Create index
    console.log('Step 5: Creating performance index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
    `);
    console.log('✓ Index created');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew role "administrator" has been added to the system.');
    console.log('Job description field is now available for all users.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
