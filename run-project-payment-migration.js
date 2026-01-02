const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running project payment tracking migration...');

    // Read migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'migrations', '014_add_project_payment_tracking.sql'),
      'utf8'
    );

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Project payment tracking migration completed successfully!');

    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name IN ('total_contract_amount', 'down_payment_amount', 'down_payment_date', 'down_payment_notes', 'down_payment_received')
      ORDER BY column_name;
    `);

    console.log('\n📋 Added columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check if function was created
    const funcResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name = 'get_project_payment_summary'
      AND routine_type = 'FUNCTION';
    `);

    if (funcResult.rows.length > 0) {
      console.log('\n✅ Function created: get_project_payment_summary');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
