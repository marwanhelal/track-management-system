const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'track_management',
  user: 'postgres',
  password: '25180047m5'
});

async function addZicoWorkLogs() {
  try {
    // Add work log entries for Zico (project_id 4 is "mall cario")
    await pool.query(
      'INSERT INTO work_logs (project_id, engineer_id, phase_id, hours, date, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [4, 14, 25, 8.00, '2025-09-19', 'Concept generation - Day 1']
    );
    console.log('Added: 8 hours for 2025-09-19');

    await pool.query(
      'INSERT INTO work_logs (project_id, engineer_id, phase_id, hours, date, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [4, 14, 25, 7.50, '2025-09-18', 'Concept generation - Day 2']
    );
    console.log('Added: 7.5 hours for 2025-09-18');

    await pool.query(
      'INSERT INTO work_logs (project_id, engineer_id, phase_id, hours, date, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [4, 14, 25, 6.00, '2025-09-17', 'Concept generation - Day 3']
    );
    console.log('Added: 6 hours for 2025-09-17');

    await pool.query(
      'INSERT INTO work_logs (project_id, engineer_id, phase_id, hours, date, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [4, 14, 26, 5.50, '2025-09-16', 'Phase details work']
    );
    console.log('Added: 5.5 hours for 2025-09-16');

    // Check total hours now
    const result = await pool.query('SELECT SUM(hours) as total_hours FROM work_logs WHERE engineer_id = 14');
    console.log('\nTotal hours for Zico now:', result.rows[0].total_hours);

    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

addZicoWorkLogs();