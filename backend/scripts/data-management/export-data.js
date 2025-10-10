const { query } = require('./dist/database/connection');
const fs = require('fs');

async function exportData() {
  try {
    console.log('Connecting to local database...');

    // Get all users
    const users = await query('SELECT * FROM users ORDER BY id');
    console.log(`Found ${users.rows.length} users`);

    // Get all projects
    const projects = await query('SELECT * FROM projects ORDER BY id');
    console.log(`Found ${projects.rows.length} projects`);

    // Get all phases
    const phases = await query('SELECT * FROM project_phases ORDER BY id');
    console.log(`Found ${phases.rows.length} phases`);

    // Get all work logs
    const workLogs = await query('SELECT * FROM work_logs ORDER BY id');
    console.log(`Found ${workLogs.rows.length} work logs`);

    // Save to JSON file
    const data = {
      users: users.rows,
      projects: projects.rows,
      phases: phases.rows,
      workLogs: workLogs.rows
    };

    fs.writeFileSync('export-data.json', JSON.stringify(data, null, 2));
    console.log('\n✅ Data exported to export-data.json');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

exportData();
