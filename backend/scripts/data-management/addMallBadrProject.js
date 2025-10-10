const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '25180047m5',
  database: 'track_management'
});

async function addMallBadrProject() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete any existing Mall Badr project
    await client.query("DELETE FROM projects WHERE name = 'Mall Badr'");
    console.log('Cleared any existing Mall Badr project\n');

    // Get supervisor ID
    const supervisorResult = await client.query("SELECT id FROM users WHERE role = 'supervisor' LIMIT 1");
    const supervisorId = supervisorResult.rows[0]?.id;

    if (!supervisorId) {
      throw new Error('No supervisor found');
    }

    // Create Mall Badr project
    console.log('Creating Mall Badr project...');
    const projectResult = await client.query(`
      INSERT INTO projects (
        name,
        start_date,
        planned_total_weeks,
        predicted_hours,
        actual_hours,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      'Mall Badr',
      '2025-02-25',
      16, // Total weeks
      303, // Total predicted hours
      0,
      'active',
      supervisorId
    ]);

    const projectId = projectResult.rows[0].id;
    console.log(`✅ Project created with ID: ${projectId}\n`);

    // Create phases with correct column names
    const phases = [
      { name: 'Concept Generation', order: 1, weeks: 2, predicted: 46, status: 'approved' },
      { name: 'Principle project', order: 2, weeks: 3, predicted: 76, status: 'in_progress' },
      { name: 'Design Development', order: 3, weeks: 3, predicted: 46, status: 'in_progress' },
      { name: 'Schematic Design', order: 4, weeks: 2, predicted: 46, status: 'submitted' },
      { name: 'Working Drawings', order: 5, weeks: 4, predicted: 76, status: 'in_progress' },
      { name: 'BOQ', order: 6, weeks: 2, predicted: 15, status: 'in_progress' }
    ];

    console.log('Creating phases...');
    for (const phase of phases) {
      const phaseResult = await client.query(`
        INSERT INTO project_phases (
          project_id,
          phase_order,
          phase_name,
          planned_weeks,
          predicted_hours,
          actual_hours,
          status,
          warning_flag,
          delay_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        projectId,
        phase.order,
        phase.name,
        phase.weeks,
        phase.predicted,
        0,
        phase.status,
        false,
        'none'
      ]);

      console.log(`  ✅ ${phase.name} (ID: ${phaseResult.rows[0].id})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Mall Badr project created successfully!');
    console.log('\nProject ID:', projectId);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMallBadrProject();
