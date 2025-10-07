import { query, closeConnection } from '../database/connection';

async function fixConstraint() {
  try {
    console.log('Removing work_logs hours check constraint...');

    // Drop the existing constraint
    await query(`
      ALTER TABLE work_logs
      DROP CONSTRAINT IF EXISTS work_logs_hours_check
    `);
    console.log('✅ Dropped old hours check constraint');

    // Add new constraint with only minimum validation
    await query(`
      ALTER TABLE work_logs
      ADD CONSTRAINT work_logs_hours_check CHECK (hours > 0)
    `);
    console.log('✅ Added new hours check constraint (no upper limit)');

    console.log('\n🎉 Constraint fix completed successfully!');

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    await closeConnection();
    process.exit(1);
  }
}

fixConstraint();
