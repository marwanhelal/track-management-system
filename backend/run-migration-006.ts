import { query } from './src/database/connection';

/**
 * Migration 006: Fix work_logs hours column for historical projects
 * This script increases the hours column from DECIMAL(4,2) to DECIMAL(10,2)
 * to support cumulative hours for historical project imports
 */

async function runMigration() {
  console.log('========================================');
  console.log('Running Migration 006: Fix work_logs hours column');
  console.log('========================================\n');

  try {
    // Step 1: Drop old CHECK constraint
    console.log('Step 1/4: Dropping old CHECK constraint...');
    await query('ALTER TABLE work_logs DROP CONSTRAINT IF EXISTS work_logs_hours_check');
    console.log('✅ Old constraint dropped\n');

    // Step 2: Change column type
    console.log('Step 2/4: Changing hours column from DECIMAL(4,2) to DECIMAL(10,2)...');
    await query('ALTER TABLE work_logs ALTER COLUMN hours TYPE DECIMAL(10,2)');
    console.log('✅ Column type changed\n');

    // Step 3: Add new CHECK constraint (no upper limit)
    console.log('Step 3/4: Adding new CHECK constraint...');
    await query('ALTER TABLE work_logs ADD CONSTRAINT work_logs_hours_check CHECK (hours > 0)');
    console.log('✅ New constraint added\n');

    // Step 4: Update column comment
    console.log('Step 4/4: Updating column comment...');
    await query(`COMMENT ON COLUMN work_logs.hours IS 'Hours worked - for regular entries max 24/day recommended, for historical imports cumulative hours allowed'`);
    console.log('✅ Comment updated\n');

    // Verify the change
    console.log('Verifying migration...');
    const result = await query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'work_logs' AND column_name = 'hours'
    `);

    console.log('Current column definition:', result.rows[0]);

    console.log('\n========================================');
    console.log('✅ Migration 006 completed successfully!');
    console.log('========================================');
    console.log('\nYou can now add historical projects with cumulative hours (200+, 500+, etc.)');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
