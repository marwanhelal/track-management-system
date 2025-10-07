import { query, closeConnection } from '../database/connection';

async function runMigration() {
  try {
    console.log('Running migration: Add submitted_date and approved_date columns...');

    // Add submitted_date column
    await query(`
      ALTER TABLE project_phases
      ADD COLUMN IF NOT EXISTS submitted_date DATE
    `);
    console.log('✅ Added submitted_date column');

    // Add approved_date column
    await query(`
      ALTER TABLE project_phases
      ADD COLUMN IF NOT EXISTS approved_date DATE
    `);
    console.log('✅ Added approved_date column');

    // Add comments
    await query(`
      COMMENT ON COLUMN project_phases.submitted_date IS 'Date when the phase was submitted to the client for review'
    `);
    await query(`
      COMMENT ON COLUMN project_phases.approved_date IS 'Date when the client approved the phase'
    `);
    console.log('✅ Added column comments');

    console.log('\n🎉 Migration completed successfully!');

    // Close connection
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await closeConnection();
    process.exit(1);
  }
}

runMigration();
