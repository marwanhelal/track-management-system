const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25180047m5',
});

/**
 * Professional Archive System Database Migration
 * Adds archive functionality to projects table
 *
 * Features:
 * - Adds archived_at timestamp column
 * - Adds archived_by foreign key to users table
 * - Creates indexes for performance
 * - Safe rollback capability
 */

const addArchiveColumns = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Archive System Migration...');

    // Begin transaction for atomic operation
    await client.query('BEGIN');

    // 1. Add archived_at column (nullable timestamp)
    console.log('📅 Adding archived_at column...');
    await client.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP
    `);

    // 2. Add archived_by column (foreign key to users table)
    console.log('👤 Adding archived_by column...');
    await client.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(id)
    `);

    // 3. Create index for archived projects queries
    console.log('🔍 Creating performance indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_archived_at
      ON projects(archived_at)
      WHERE archived_at IS NOT NULL
    `);

    // 4. Create composite index for efficient filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status_archived
      ON projects(status, archived_at)
    `);

    // 5. Add comment for documentation
    await client.query(`
      COMMENT ON COLUMN projects.archived_at IS 'Timestamp when project was archived by supervisor'
    `);

    await client.query(`
      COMMENT ON COLUMN projects.archived_by IS 'ID of supervisor who archived the project'
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Archive System Migration completed successfully!');
    console.log('');
    console.log('📊 New Columns Added:');
    console.log('   - archived_at: TIMESTAMP (nullable)');
    console.log('   - archived_by: INTEGER (foreign key to users.id)');
    console.log('');
    console.log('🔍 Indexes Created:');
    console.log('   - idx_projects_archived_at (for archived project queries)');
    console.log('   - idx_projects_status_archived (for combined status/archive filtering)');
    console.log('');
    console.log('🎯 Archive System Features Enabled:');
    console.log('   ✓ Professional project archiving');
    console.log('   ✓ Supervisor tracking');
    console.log('   ✓ Optimized query performance');
    console.log('   ✓ Data integrity preservation');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;

  } finally {
    client.release();
  }
};

// Rollback function for development/testing
const rollbackArchiveColumns = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Rolling back Archive System Migration...');

    await client.query('BEGIN');

    // Drop indexes
    await client.query('DROP INDEX IF EXISTS idx_projects_archived_at');
    await client.query('DROP INDEX IF EXISTS idx_projects_status_archived');

    // Drop columns
    await client.query('ALTER TABLE projects DROP COLUMN IF EXISTS archived_by');
    await client.query('ALTER TABLE projects DROP COLUMN IF EXISTS archived_at');

    await client.query('COMMIT');

    console.log('✅ Archive System Migration rolled back successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error.message);
    throw error;

  } finally {
    client.release();
  }
};

// Verify migration function
const verifyMigration = async () => {
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying Archive System Migration...');

    // Check if columns exist
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projects'
      AND column_name IN ('archived_at', 'archived_by')
      ORDER BY column_name
    `);

    if (result.rows.length === 2) {
      console.log('✅ Migration verification successful!');
      console.log('📋 Archive columns found:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      // Check indexes
      const indexResult = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'projects'
        AND indexname LIKE '%archived%'
      `);

      console.log('🔍 Archive indexes found:');
      indexResult.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });

      return true;
    } else {
      console.log('❌ Migration verification failed - columns not found');
      return false;
    }

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;

  } finally {
    client.release();
  }
};

// Main execution
const main = async () => {
  try {
    const args = process.argv.slice(2);

    if (args.includes('--rollback')) {
      await rollbackArchiveColumns();
    } else if (args.includes('--verify')) {
      await verifyMigration();
    } else {
      await addArchiveColumns();
      await verifyMigration();
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);

  } finally {
    await pool.end();
  }
};

// Run migration if called directly
if (require.main === module) {
  main();
}

module.exports = {
  addArchiveColumns,
  rollbackArchiveColumns,
  verifyMigration
};