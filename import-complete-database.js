const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// VPS Database configuration
const pool = new Pool({
  host: 'd400sc04840g0cwkokkscwos',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'ds8S2jBUkyqhUrs9UiiARlz6woNKqvVTGtKak8o83T4RMEpCcOKkO3OauxFFti3K',
  ssl: false
});

async function importDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔌 Connected to VPS database');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database_complete.sql');
    console.log(`📄 Reading SQL file: ${sqlFile}`);

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`📊 File size: ${(sql.length / 1024).toFixed(2)} KB`);

    // Drop existing tables first
    console.log('\n🗑️  Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS work_logs CASCADE;
      DROP TABLE IF EXISTS project_settings CASCADE;
      DROP TABLE IF EXISTS project_phases CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS predefined_phases CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Existing tables dropped');

    // Execute the SQL file
    console.log('\n📥 Importing database...');
    await client.query(sql);
    console.log('✅ Database imported successfully!');

    // Verify the import
    console.log('\n🔍 Verifying import...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 Tables created:');
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));

    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const projectCount = await client.query('SELECT COUNT(*) FROM projects');
    const phaseCount = await client.query('SELECT COUNT(*) FROM project_phases');
    const workLogCount = await client.query('SELECT COUNT(*) FROM work_logs');

    console.log('\n📊 Data imported:');
    console.log(`   - Users: ${userCount.rows[0].count}`);
    console.log(`   - Projects: ${projectCount.rows[0].count}`);
    console.log(`   - Phases: ${phaseCount.rows[0].count}`);
    console.log(`   - Work Logs: ${workLogCount.rows[0].count}`);

    console.log('\n✅ Import completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error importing database:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importDatabase();
