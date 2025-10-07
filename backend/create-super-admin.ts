import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function createSuperAdmin() {
  try {
    console.log('🔧 Setting up Super Admin account...\n');

    // Step 1: Add is_super_admin column to users table if it doesn't exist
    console.log('📊 Step 1: Adding is_super_admin column to users table...');
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
    `);
    console.log('   ✅ Column added/verified\n');

    // Step 2: Check if marwanhelal15@gmail.com already exists
    console.log('🔍 Step 2: Checking if user already exists...');
    const existingUser = await pool.query(
      'SELECT id, name, email, role, is_super_admin FROM users WHERE email = $1',
      ['marwanhelal15@gmail.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('   ⚠️  User already exists!');
      console.log(`   User: ${existingUser.rows[0].name} (${existingUser.rows[0].email})`);
      console.log(`   Role: ${existingUser.rows[0].role}`);
      console.log(`   Super Admin: ${existingUser.rows[0].is_super_admin}`);

      // Update existing user to super admin
      console.log('\n🔄 Step 3: Updating existing user to Super Admin...');
      await pool.query(
        `UPDATE users
         SET is_super_admin = TRUE,
             role = 'supervisor',
             name = $1
         WHERE email = $2`,
        ['Marwan Helal', 'marwanhelal15@gmail.com']
      );
      console.log('   ✅ User updated to Super Admin status\n');
    } else {
      // Step 3: Create new super admin user
      console.log('   ℹ️  User does not exist. Creating new user...\n');
      console.log('🔐 Step 3: Hashing password...');

      const password = '25180047Mm!';
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
      const passwordHash = await bcrypt.hash(password, bcryptRounds);
      console.log('   ✅ Password hashed securely\n');

      console.log('👤 Step 4: Creating Super Admin user...');
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, is_super_admin)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, role, is_super_admin`,
        ['Marwan Helal', 'marwanhelal15@gmail.com', passwordHash, 'supervisor', true, true]
      );

      console.log('   ✅ Super Admin user created successfully!\n');
      console.log('   User Details:');
      console.log(`   - ID: ${result.rows[0].id}`);
      console.log(`   - Name: ${result.rows[0].name}`);
      console.log(`   - Email: ${result.rows[0].email}`);
      console.log(`   - Role: ${result.rows[0].role}`);
      console.log(`   - Super Admin: ${result.rows[0].is_super_admin}`);
    }

    // Step 4: Verify all supervisors
    console.log('\n\n📋 Step 5: Listing all supervisor accounts...');
    console.log('═══════════════════════════════════════════════════');
    const supervisors = await pool.query(
      `SELECT id, name, email, role, is_super_admin
       FROM users
       WHERE role = 'supervisor'
       ORDER BY is_super_admin DESC, id`
    );

    supervisors.rows.forEach((user, index) => {
      const badge = user.is_super_admin ? '🔐 SUPER ADMIN' : '👤 Regular Supervisor';
      console.log(`${index + 1}. ${badge}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('✨ Super Admin Setup Complete!\n');
    console.log('📝 Login Credentials:');
    console.log('   Email: marwanhelal15@gmail.com');
    console.log('   Password: 25180047Mm!');
    console.log('\n🔒 Permissions:');
    console.log('   ✅ Can permanently delete supervisor accounts');
    console.log('   ✅ Can permanently delete engineer accounts');
    console.log('   ✅ Full system access');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
