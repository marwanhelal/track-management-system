const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '25180047m5',
  database: 'track_management'
});

async function deleteAllProjects() {
  try {
    // First check the structure
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    console.log('Projects table columns:', columnsResult.rows.map(r => r.column_name).join(', '));

    // Delete all projects (will cascade to related tables)
    const result = await pool.query('DELETE FROM projects RETURNING *');
    console.log(`\nDeleted ${result.rowCount} projects`);

    // Reset the sequence
    await pool.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1');
    console.log('Sequence reset to 1');

    console.log('\n✅ All test projects deleted successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

deleteAllProjects();
