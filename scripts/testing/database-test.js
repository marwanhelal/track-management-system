const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function testDatabaseConnection() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'track_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    console.log(`Host: ${client.host}:${client.port}`);
    console.log(`Database: ${client.database}`);
    console.log(`User: ${client.user}`);

    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('📋 PostgreSQL version:', result.rows[0].version);

    // Check if our tables exist
    console.log('\n📊 Checking database schema...');
    const tableResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tableResult.rows.length > 0) {
      console.log('✅ Found database tables:');
      tableResult.rows.forEach(row => {
        console.log(`  - ${row.table_name} (${row.table_type})`);
      });
    } else {
      console.log('⚠️  No tables found in public schema');
    }

    // Check data counts
    console.log('\n📈 Data summary:');
    const tables = ['users', 'projects', 'project_phases', 'work_logs', 'predefined_phases'];

    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  - ${table}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`  - ${table}: Table not found`);
      }
    }

    // Test database triggers and functions
    console.log('\n🔧 Database functions and triggers:');
    const functionsResult = await client.query(`
      SELECT proname as function_name
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND prokind = 'f'
      ORDER BY proname
    `);

    if (functionsResult.rows.length > 0) {
      console.log('✅ Found database functions:');
      functionsResult.rows.forEach(row => {
        console.log(`  - ${row.function_name}()`);
      });
    }

    const triggersResult = await client.query(`
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name
    `);

    if (triggersResult.rows.length > 0) {
      console.log('✅ Found database triggers:');
      triggersResult.rows.forEach(row => {
        console.log(`  - ${row.trigger_name} on ${row.event_object_table} (${row.action_timing} ${row.event_manipulation})`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);

    // Provide specific error guidance
    if (error.code === '28P01') {
      console.error('💡 Authentication failed. Please check:');
      console.error('   - Database password in backend/.env file');
      console.error('   - PostgreSQL user permissions');
      console.error('   - PostgreSQL pg_hba.conf configuration');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Please check:');
      console.error('   - PostgreSQL service is running');
      console.error('   - Port 5432 is accessible');
      console.error('   - Host configuration is correct');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Please check:');
      console.error('   - Database name is correct');
      console.error('   - Database has been created');
    }

    return false;

  } finally {
    try {
      await client.end();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing connection:', error.message);
    }
  }
}

// Run the test
testDatabaseConnection().then(success => {
  console.log(`\n🏁 Database test ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});