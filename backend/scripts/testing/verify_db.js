const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'track_management',
  user: 'postgres',
  password: '25180047m5',
  ssl: false
});

async function verifyDatabase() {
  try {
    console.log('🔄 Connecting to database...');

    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0]?.now);

    // Check project_phases table structure
    console.log('\n🔍 Checking project_phases table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'project_phases'
      ORDER BY ordinal_position;
    `);

    console.log('📊 project_phases columns:');
    tableInfo.rows.forEach(row => {
      const early = row.column_name.includes('early_access') ? '🔥 ' : '   ';
      console.log(`${early}${row.column_name} (${row.data_type})`);
    });

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexInfo = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'project_phases'
      ORDER BY indexname;
    `);

    console.log('📊 project_phases indexes:');
    indexInfo.rows.forEach(row => {
      const early = row.indexname.includes('early_access') ? '🔥 ' : '   ';
      console.log(`${early}${row.indexname}`);
    });

    // Sample existing data
    console.log('\n🔍 Checking existing project phases...');
    const dataInfo = await client.query(`
      SELECT id, project_id, phase_name, status, early_access_granted, early_access_status
      FROM project_phases
      LIMIT 5;
    `);

    console.log('📊 Sample project phases:');
    dataInfo.rows.forEach(row => {
      console.log(`   Phase ${row.id}: ${row.phase_name} (Status: ${row.status}, Early Access: ${row.early_access_granted})`);
    });

    client.release();

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyDatabase()
  .then(() => {
    console.log('\n🎉 Database verification completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });