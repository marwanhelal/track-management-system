const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'track_management',
  user: 'postgres',
  password: '25180047m5',
  ssl: false
});

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0]?.now);

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '001_add_early_access_to_phases.sql');
    console.log('📄 Reading migration file:', migrationPath);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');

    // Execute migration
    console.log('🚀 Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully!');

    // Verify the changes
    console.log('🔍 Verifying database changes...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'project_phases'
        AND column_name LIKE '%early_access%'
      ORDER BY column_name;
    `);

    console.log('✅ Early access columns added:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check indexes
    const indexInfo = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'project_phases'
        AND indexname LIKE '%early_access%';
    `);

    console.log('✅ Early access indexes created:');
    indexInfo.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    client.release();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });