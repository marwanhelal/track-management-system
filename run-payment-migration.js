const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    const migrationSQL = fs.readFileSync('database/migrations/013_add_phase_payment_tracking.sql', 'utf8');
    console.log('📄 Running migration: 013_add_phase_payment_tracking.sql');

    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Verify tables were created
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'phase_payments'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ Table phase_payments created successfully');
    }

    // Check columns added to project_phases
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'project_phases' AND column_name IN ('total_amount', 'paid_amount', 'payment_status')
    `);

    console.log('✅ Added columns to project_phases:', columnCheck.rows.map(r => r.column_name).join(', '));

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
