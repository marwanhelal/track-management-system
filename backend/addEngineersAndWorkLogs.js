const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '25180047m5',
  database: 'track_management'
});

async function addEngineersAndWorkLogs() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get project and phase IDs
    const projectResult = await client.query("SELECT id FROM projects WHERE name = 'Mall Badr'");
    const projectId = projectResult.rows[0]?.id;

    if (!projectId) {
      throw new Error('Mall Badr project not found');
    }

    const phasesResult = await client.query(`
      SELECT id, phase_name, phase_order
      FROM project_phases
      WHERE project_id = $1
      ORDER BY phase_order
    `, [projectId]);

    const phases = {
      'Concept Generation': phasesResult.rows[0].id,
      'Principle project': phasesResult.rows[1].id,
      'Design Development': phasesResult.rows[2].id,
      'Schematic Design': phasesResult.rows[3].id,
      'Working Drawings': phasesResult.rows[4].id,
      'BOQ': phasesResult.rows[5].id
    };

    console.log('Project ID:', projectId);
    console.log('\nPhases:');
    phasesResult.rows.forEach(p => console.log(`  ${p.phase_order}. ${p.phase_name} (ID: ${p.id})`));

    // Engineers to create
    const engineers = [
      { name: 'Fakharany', email: 'fakharany@mall.com' },
      { name: 'Baloumy', email: 'baloumy@mall.com' },
      { name: 'Consultant', email: 'consultant@mall.com' },
      { name: 'Rostom', email: 'rostom@mall.com' },
      { name: 'Mourhan', email: 'mourhan@mall.com' },
      { name: 'Nourhan', email: 'nourhan@mall.com' },
      { name: 'serag', email: 'serag@mall.com' },
      { name: 'Asmaa', email: 'asmaa@mall.com' }
    ];

    const engineerIds = {};
    const password = await bcrypt.hash('password123', 12);

    console.log('\nCreating engineers...');
    for (const eng of engineers) {
      // Check if exists
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [eng.email]);

      if (existing.rows.length > 0) {
        engineerIds[eng.name] = existing.rows[0].id;
        console.log(`  ✅ ${eng.name} (already exists, ID: ${existing.rows[0].id})`);
      } else {
        const result = await client.query(`
          INSERT INTO users (name, email, password_hash, role, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [eng.name, eng.email, password, 'engineer', true]);

        engineerIds[eng.name] = result.rows[0].id;
        console.log(`  ✅ ${eng.name} (created, ID: ${result.rows[0].id})`);
      }
    }

    console.log('\nAdding work logs (splitting large hours into 24h max entries)...');

    // Helper function to split hours into multiple entries (max 24h each)
    const addWorkLog = async (engineer, phase, totalHours, description) => {
      let remaining = totalHours;
      let dayOffset = 0;

      while (remaining > 0) {
        const hours = Math.min(24, remaining);
        const date = new Date('2025-02-25');
        date.setDate(date.getDate() + dayOffset);

        await client.query(`
          INSERT INTO work_logs (
            project_id,
            phase_id,
            engineer_id,
            date,
            hours,
            description,
            supervisor_approved
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          projectId,
          phases[phase],
          engineerIds[engineer],
          date.toISOString().split('T')[0],
          hours,
          description,
          true
        ]);

        remaining -= hours;
        dayOffset++;
      }

      console.log(`  ✅ ${engineer}: ${totalHours}h on ${phase} (${Math.ceil(totalHours / 24)} entries)`);
    };

    // Work logs based on the spreadsheet
    await addWorkLog('Fakharany', 'Concept Generation', 4, 'Concept design work');
    await addWorkLog('Baloumy', 'Concept Generation', 52, 'Concept development');
    await addWorkLog('Consultant', 'Concept Generation', 40, 'Consultation work');
    await addWorkLog('Rostom', 'Principle project', 80, 'Principle project work');
    await addWorkLog('Mourhan', 'Design Development', 45, 'Design development work');
    await addWorkLog('Nourhan', 'Schematic Design', 8, 'Schematic design work');
    await addWorkLog('serag', 'Working Drawings', 3, 'Working drawings');
    await addWorkLog('Asmaa', 'BOQ', 6, 'BOQ preparation');

    await client.query('COMMIT');
    console.log('\n✅ All engineers and work logs added successfully!');
    console.log('\nTotal hours logged: 238h (matching spreadsheet)');
    console.log('Phases will auto-update their actual_hours via database triggers');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addEngineersAndWorkLogs();
