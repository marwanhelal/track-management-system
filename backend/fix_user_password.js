const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'track_management',
  user: 'postgres',
  password: '25180047m5',
  ssl: false
});

async function fixUserPassword() {
  try {
    console.log('🔧 Fixing user password for testing...');

    const client = await pool.connect();

    // Hash the password "password"
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('password', saltRounds);
    console.log(`🔐 Generated password hash for "password"`);

    // Update marwan@test.com user
    await client.query(`
      UPDATE users
      SET password_hash = $1
      WHERE email = 'marwan@test.com';
    `, [hashedPassword]);

    console.log('✅ Updated password for marwan@test.com');

    // Verify the user exists
    const userResult = await client.query(`
      SELECT id, name, email, role, is_active
      FROM users
      WHERE email = 'marwan@test.com';
    `);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`👤 User verified: ${user.name} (${user.email}) - Role: ${user.role}`);
    } else {
      console.log('❌ User not found after update');
    }

    client.release();

    console.log('\n🎉 Password fixed! You can now login with:');
    console.log('   Email: marwan@test.com');
    console.log('   Password: password');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixUserPassword()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });