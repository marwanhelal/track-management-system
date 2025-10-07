const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '25180047m5',
  database: 'track_management'
});

async function updatePhaseDates() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get Mall Badr project
    const projectResult = await client.query("SELECT id FROM projects WHERE name = 'Mall Badr'");
    const project = projectResult.rows[0];

    if (!project) {
      throw new Error('Mall Badr project not found');
    }

    console.log('Updating phase dates to match spreadsheet...\n');

    // Use exact dates from spreadsheet
    const phases = [
      {
        name: 'Concept Generation',
        start: '2025-02-25',
        end: '2025-03-11'
      },
      {
        name: 'Principle project',
        start: '2025-03-12',
        end: '2025-04-01'
      },
      {
        name: 'Design Development',
        start: '2025-04-02',
        end: '2025-04-22'
      },
      {
        name: 'Schematic Design',
        start: '2025-04-23',
        end: '2025-05-06'
      },
      {
        name: 'Working Drawings',
        start: '2025-05-07',
        end: '2025-06-03'
      },
      {
        name: 'BOQ',
        start: '2025-06-04',
        end: '2025-06-17'
      }
    ];

    for (const phase of phases) {
      await client.query(`
        UPDATE project_phases
        SET
          planned_start_date = $1,
          planned_end_date = $2
        WHERE project_id = $3 AND phase_name = $4
      `, [
        phase.start,
        phase.end,
        project.id,
        phase.name
      ]);

      console.log(`✅ ${phase.name}:`);
      console.log(`   Start: ${phase.start}`);
      console.log(`   End: ${phase.end}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All phase dates updated to match spreadsheet!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updatePhaseDates();
