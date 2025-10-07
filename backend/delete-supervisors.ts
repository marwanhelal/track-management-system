import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function deleteSupervisors() {
  try {
    console.log('🔍 Fetching all supervisor accounts...\n');

    // First, list all supervisors
    const listResult = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role = 'supervisor'
       ORDER BY id`
    );

    console.log('📋 Current Supervisors:');
    console.log('========================');
    listResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} | Name: ${user.name} | Email: ${user.email}`);
    });
    console.log('');

    // Get the ID of the user we want to keep
    const keepUserResult = await pool.query(
      `SELECT id FROM users WHERE email = 'mazenhelal15@gmail.com'`
    );

    if (keepUserResult.rows.length === 0) {
      console.error('❌ User mazenhelal15@gmail.com not found!');
      return;
    }

    const keepUserId = keepUserResult.rows[0].id;
    console.log(`✅ Will keep user ID: ${keepUserId} (mazenhelal15@gmail.com)\n`);

    // STEP 1: Reassign all projects created by other supervisors to the user we're keeping
    console.log('🔄 Step 1: Reassigning projects to mazenhelal15@gmail.com...');
    const reassignProjectsResult = await pool.query(
      `UPDATE projects
       SET created_by = $1
       WHERE created_by IN (
         SELECT id FROM users
         WHERE role = 'supervisor'
         AND email != 'mazenhelal15@gmail.com'
       )
       RETURNING id, name`,
      [keepUserId]
    );

    console.log(`   ✅ Reassigned ${reassignProjectsResult.rowCount} projects`);

    // STEP 1b: Reassign audit logs
    console.log('🔄 Step 1b: Reassigning audit logs...');
    const reassignAuditResult = await pool.query(
      `UPDATE audit_logs
       SET user_id = $1
       WHERE user_id IN (
         SELECT id FROM users
         WHERE role = 'supervisor'
         AND email != 'mazenhelal15@gmail.com'
       )
       RETURNING id`,
      [keepUserId]
    );

    console.log(`   ✅ Reassigned ${reassignAuditResult.rowCount} audit log entries\n`);

    // STEP 2: Delete all supervisors EXCEPT mazenhelal15@gmail.com
    console.log('🗑️  Step 2: Deleting unwanted supervisor accounts...');
    const deleteResult = await pool.query(
      `DELETE FROM users
       WHERE role = 'supervisor'
       AND email != 'mazenhelal15@gmail.com'
       RETURNING id, name, email`
    );

    console.log(`\n✅ Deleted ${deleteResult.rowCount} supervisor accounts:`);
    console.log('================================================');
    deleteResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
    });

    // STEP 3: List remaining supervisors
    const remainingResult = await pool.query(
      `SELECT id, name, email, role
       FROM users
       WHERE role = 'supervisor'`
    );

    console.log(`\n\n✅ Remaining Supervisors (${remainingResult.rowCount}):`);
    console.log('====================================');
    remainingResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name} | Email: ${user.email}`);
    });

    console.log('\n✨ Operation completed successfully!');

  } catch (error) {
    console.error('❌ Error deleting supervisors:', error);
  } finally {
    await pool.end();
  }
}

// Run the deletion
deleteSupervisors();
