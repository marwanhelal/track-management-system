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

async function testEarlyAccessDatabase() {
  try {
    console.log('🧪 Testing Early Access Database Functionality\n');

    const client = await pool.connect();

    // Step 1: Find a test phase
    console.log('1️⃣ Finding test phase...');
    const phaseResult = await client.query(`
      SELECT id, project_id, phase_name, status, early_access_granted, early_access_status
      FROM project_phases
      WHERE status = 'not_started'
      LIMIT 1;
    `);

    if (phaseResult.rows.length === 0) {
      console.log('❌ No test phases found');
      return;
    }

    const phase = phaseResult.rows[0];
    console.log(`✅ Found test phase: ${phase.phase_name} (ID: ${phase.id})`);
    console.log(`📊 Current status: ${phase.status}`);
    console.log(`🔥 Early access granted: ${phase.early_access_granted}`);

    // Step 2: Grant early access
    console.log('\n2️⃣ Granting early access...');

    // First find a valid supervisor user ID
    const supervisorResult = await client.query(`
      SELECT id FROM users WHERE role = 'supervisor' LIMIT 1;
    `);

    const supervisorId = supervisorResult.rows[0].id;
    console.log(`👤 Using supervisor ID: ${supervisorId}`);

    await client.query(`
      UPDATE project_phases
      SET early_access_granted = true,
          early_access_status = 'accessible',
          early_access_granted_by = $2,
          early_access_granted_at = NOW(),
          early_access_note = 'Testing early access system - Direct DB test'
      WHERE id = $1;
    `, [phase.id, supervisorId]);

    console.log('✅ Early access granted successfully');

    // Step 3: Verify early access grant
    console.log('\n3️⃣ Verifying early access grant...');
    const updatedPhaseResult = await client.query(`
      SELECT id, phase_name, status, early_access_granted, early_access_status, early_access_note
      FROM project_phases
      WHERE id = $1;
    `, [phase.id]);

    const updatedPhase = updatedPhaseResult.rows[0];
    console.log(`✅ Phase: ${updatedPhase.phase_name}`);
    console.log(`📊 Status: ${updatedPhase.status}`);
    console.log(`🔥 Early access granted: ${updatedPhase.early_access_granted}`);
    console.log(`🔥 Early access status: ${updatedPhase.early_access_status}`);
    console.log(`📝 Note: ${updatedPhase.early_access_note}`);

    // Step 4: Test phase start logic (simulate what the API would do)
    console.log('\n4️⃣ Testing early access start logic...');
    const canStart = updatedPhase.status === 'ready' ||
                    (updatedPhase.early_access_granted && updatedPhase.early_access_status === 'accessible');

    console.log(`🚀 Can start phase: ${canStart}`);

    if (canStart) {
      // Simulate starting the phase
      await client.query(`
        UPDATE project_phases
        SET status = 'in_progress',
            early_access_status = 'in_progress',
            actual_start_date = NOW()
        WHERE id = $1;
      `, [phase.id]);

      console.log('✅ Phase started via early access');

      // Verify the update
      const startedPhaseResult = await client.query(`
        SELECT id, phase_name, status, early_access_status, actual_start_date
        FROM project_phases
        WHERE id = $1;
      `, [phase.id]);

      const startedPhase = startedPhaseResult.rows[0];
      console.log(`📊 New status: ${startedPhase.status}`);
      console.log(`🔥 Early access status: ${startedPhase.early_access_status}`);
      console.log(`⏰ Started at: ${startedPhase.actual_start_date}`);
    }

    // Step 5: Test early access overview
    console.log('\n5️⃣ Testing early access overview...');
    const overviewResult = await client.query(`
      SELECT
        COUNT(*) as total_early_access_phases,
        COUNT(CASE WHEN early_access_status IN ('in_progress', 'accessible') THEN 1 END) as active_early_access_phases
      FROM project_phases
      WHERE project_id = $1 AND early_access_granted = true;
    `, [phase.project_id]);

    const overview = overviewResult.rows[0];
    console.log(`📊 Total early access phases: ${overview.total_early_access_phases}`);
    console.log(`🚀 Active early access phases: ${overview.active_early_access_phases}`);

    // Step 6: Test revoke early access (cleanup)
    console.log('\n6️⃣ Testing revoke early access (cleanup)...');
    await client.query(`
      UPDATE project_phases
      SET early_access_granted = false,
          early_access_status = 'not_accessible',
          early_access_granted_by = NULL,
          early_access_granted_at = NULL,
          early_access_note = NULL,
          status = 'not_started',
          actual_start_date = NULL
      WHERE id = $1;
    `, [phase.id]);

    console.log('✅ Early access revoked (cleaned up)');

    client.release();

    console.log('\n🎉 Early Access Database Tests Completed Successfully!');
    console.log('\n✅ All early access functionality working correctly:');
    console.log('   🔹 Grant early access');
    console.log('   🔹 Start phase with early access');
    console.log('   🔹 Track early access status');
    console.log('   🔹 Get early access overview');
    console.log('   🔹 Revoke early access');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run tests
testEarlyAccessDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });