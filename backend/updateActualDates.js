const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '25180047m5',
  database: 'track_management'
});

async function updateActualDates() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get Mall Badr project
    const projectResult = await client.query("SELECT id FROM projects WHERE name = 'Mall Badr'");
    const project = projectResult.rows[0];

    console.log('Updating actual dates for phases...\n');

    // Set actual dates based on status
    const updates = [
      {
        name: 'Concept Generation',
        status: 'approved',
        actual_start: '2025-02-25',
        actual_end: '2025-03-15', // Delivery date from spreadsheet
        note: 'Approved phase - set both start and end'
      },
      {
        name: 'Schematic Design',
        status: 'submitted',
        actual_start: '2025-04-23',
        actual_end: null, // Not completed yet, just submitted
        note: 'Submitted phase - set start only'
      }
    ];

    // For in_progress phases, set actual_start based on first work log
    const inProgressPhases = ['Principle project', 'Design Development', 'Working Drawings', 'BOQ'];

    for (const phaseName of inProgressPhases) {
      // Get first work log date for this phase
      const workLogResult = await client.query(`
        SELECT MIN(wl.date) as first_log_date
        FROM work_logs wl
        JOIN project_phases pp ON wl.phase_id = pp.id
        WHERE pp.project_id = $1 AND pp.phase_name = $2
      `, [project.id, phaseName]);

      const firstLogDate = workLogResult.rows[0]?.first_log_date;

      if (firstLogDate) {
        updates.push({
          name: phaseName,
          status: 'in_progress',
          actual_start: firstLogDate.toISOString().split('T')[0],
          actual_end: null,
          note: 'In progress - start from first work log'
        });
      }
    }

    // Apply updates
    for (const update of updates) {
      await client.query(`
        UPDATE project_phases
        SET
          actual_start_date = $1,
          actual_end_date = $2
        WHERE project_id = $3 AND phase_name = $4
      `, [
        update.actual_start,
        update.actual_end,
        project.id,
        update.name
      ]);

      console.log(`✅ ${update.name} (${update.status}):`);
      console.log(`   Actual Start: ${update.actual_start || 'Not set'}`);
      console.log(`   Actual End: ${update.actual_end || 'Not completed'}`);
      console.log(`   (${update.note})\n`);
    }

    await client.query('COMMIT');
    console.log('✅ All actual dates updated!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateActualDates();
