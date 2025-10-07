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

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users...');

    const client = await pool.connect();

    // Get all users
    const usersResult = await client.query(`
      SELECT id, name, email, role, is_active
      FROM users
      ORDER BY id ASC;
    `);

    console.log(`📊 Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(user => {
      console.log(`   👤 ${user.name} (${user.email}) - Role: ${user.role}, Active: ${user.is_active}`);
    });

    // Get projects
    const projectsResult = await client.query(`
      SELECT id, name, status, created_by
      FROM projects
      ORDER BY id ASC
      LIMIT 3;
    `);

    console.log(`\n📊 Found ${projectsResult.rows.length} projects:`);
    projectsResult.rows.forEach(project => {
      console.log(`   📋 Project ${project.id}: ${project.name} (Status: ${project.status})`);
    });

    client.release();

  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkUsers()
  .then(() => {
    console.log('\n🎉 Check completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });