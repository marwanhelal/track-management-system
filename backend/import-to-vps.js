const { Pool } = require('pg');
const fs = require('fs');

// VPS PostgreSQL connection
const pool = new Pool({
  host: 'd400sc04840g0cwkokkscwos',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'ds8S2jBUkyqhUrs9UiiARlz6woNKqvVTGtKak8o83T4RMEpCcOKkO3OauxFFti3K',
  ssl: false
});

async function createSchema() {
  console.log('Creating database schema...');

  const schema = `
    -- Drop existing tables
    DROP TABLE IF EXISTS work_logs CASCADE;
    DROP TABLE IF EXISTS project_phases CASCADE;
    DROP TABLE IF EXISTS projects CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    -- Users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('supervisor', 'engineer', 'administrator')),
      job_description VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Projects table
    CREATE TABLE projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      start_date DATE NOT NULL DEFAULT CURRENT_DATE,
      planned_total_weeks INTEGER NOT NULL CHECK (planned_total_weeks > 0),
      predicted_hours INTEGER NOT NULL CHECK (predicted_hours > 0),
      actual_hours INTEGER DEFAULT 0 CHECK (actual_hours >= 0),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Project Phases table
    CREATE TABLE project_phases (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      phase_order INTEGER NOT NULL CHECK (phase_order > 0),
      phase_name VARCHAR(100) NOT NULL,
      is_custom BOOLEAN DEFAULT false,
      planned_weeks INTEGER NOT NULL CHECK (planned_weeks > 0),
      planned_start_date DATE,
      planned_end_date DATE,
      actual_start_date DATE,
      actual_end_date DATE,
      submitted_date DATE,
      approved_date DATE,
      status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'ready', 'in_progress', 'submitted', 'approved', 'completed')),
      delay_reason VARCHAR(20) DEFAULT 'none' CHECK (delay_reason IN ('none', 'client', 'company')),
      warning_flag BOOLEAN DEFAULT false,
      predicted_hours INTEGER CHECK (predicted_hours >= 0),
      actual_hours INTEGER DEFAULT 0 CHECK (actual_hours >= 0),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(project_id, phase_order)
    );

    -- Work Logs table
    CREATE TABLE work_logs (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
      engineer_id INTEGER NOT NULL REFERENCES users(id),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
      description TEXT,
      supervisor_approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_projects_status ON projects(status);
    CREATE INDEX idx_project_phases_project_id ON project_phases(project_id);
    CREATE INDEX idx_work_logs_project_phase ON work_logs(project_id, phase_id);
  `;

  await pool.query(schema);
  console.log('✅ Schema created successfully');
}

async function importData() {
  try {
    console.log('🔄 Starting import to VPS database...\n');

    // Create schema first
    await createSchema();

    // Read exported data
    const data = JSON.parse(fs.readFileSync('export-data.json', 'utf8'));

    // Import users
    console.log(`\nImporting ${data.users.length} users...`);
    for (const user of data.users) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, job_description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user.id, user.name, user.email, user.password_hash, user.role, user.job_description, user.is_active, user.created_at, user.updated_at]
      );
    }
    console.log('✅ Users imported');

    // Fix user ID sequence
    await pool.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);

    // Import projects
    console.log(`\nImporting ${data.projects.length} projects...`);
    for (const project of data.projects) {
      await pool.query(
        `INSERT INTO projects (id, name, start_date, planned_total_weeks, predicted_hours, actual_hours, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [project.id, project.name, project.start_date, project.planned_total_weeks, project.predicted_hours, project.actual_hours, project.status, project.created_by, project.created_at, project.updated_at]
      );
    }
    console.log('✅ Projects imported');

    // Fix project ID sequence
    await pool.query(`SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects))`);

    // Import phases
    console.log(`\nImporting ${data.phases.length} phases...`);
    for (const phase of data.phases) {
      await pool.query(
        `INSERT INTO project_phases (id, project_id, phase_order, phase_name, is_custom, planned_weeks, planned_start_date, planned_end_date, actual_start_date, actual_end_date, submitted_date, approved_date, status, delay_reason, warning_flag, predicted_hours, actual_hours, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [phase.id, phase.project_id, phase.phase_order, phase.phase_name, phase.is_custom, phase.planned_weeks, phase.planned_start_date, phase.planned_end_date, phase.actual_start_date, phase.actual_end_date, phase.submitted_date, phase.approved_date, phase.status, phase.delay_reason, phase.warning_flag, phase.predicted_hours, phase.actual_hours, phase.created_at, phase.updated_at]
      );
    }
    console.log('✅ Phases imported');

    // Fix phase ID sequence
    await pool.query(`SELECT setval('project_phases_id_seq', (SELECT MAX(id) FROM project_phases))`);

    // Import work logs
    console.log(`\nImporting ${data.workLogs.length} work logs...`);
    for (const log of data.workLogs) {
      await pool.query(
        `INSERT INTO work_logs (id, project_id, phase_id, engineer_id, date, hours, description, supervisor_approved, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [log.id, log.project_id, log.phase_id, log.engineer_id, log.date, log.hours, log.description, log.supervisor_approved, log.created_at, log.updated_at]
      );
    }
    console.log('✅ Work logs imported');

    // Fix work log ID sequence
    await pool.query(`SELECT setval('work_logs_id_seq', (SELECT MAX(id) FROM work_logs))`);

    console.log('\n🎉 All data imported successfully!');
    console.log('\nSummary:');
    console.log(`  - ${data.users.length} users`);
    console.log(`  - ${data.projects.length} projects`);
    console.log(`  - ${data.phases.length} phases`);
    console.log(`  - ${data.workLogs.length} work logs`);

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importData();
