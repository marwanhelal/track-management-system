const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'track_management',
  user: 'postgres',
  password: '25180047m5',
  ssl: false
});

async function applySmartWarningMigration() {
  try {
    console.log('🚀 Applying Smart Warning System Migration...');

    const client = await pool.connect();

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/002_add_smart_warning_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Reading migration file...');

    // Execute the migration
    console.log('⚡ Executing smart warning system migration...');
    await client.query(migrationSQL);

    console.log('✅ Smart Warning System Migration Applied Successfully!');
    console.log('📊 New tables created:');
    console.log('   - warning_analytics (Advanced warning intelligence)');
    console.log('   - phase_dependencies (Connected phase logic)');
    console.log('   - resource_predictions (Smart analytics)');
    console.log('   - project_timeline_forecasts (Predictive intelligence)');
    console.log('   - critical_path_analysis (Connected intelligence)');
    console.log('   - smart_notification_rules (Professional logic)');
    console.log('🧠 Smart functions added:');
    console.log('   - calculate_phase_impact_score()');
    console.log('   - predict_project_completion()');
    console.log('   - generate_smart_warning()');
    console.log('⚡ Automatic triggers enabled for budget warnings');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('warning_analytics', 'phase_dependencies', 'resource_predictions')
      ORDER BY table_name
    `);

    console.log('🔍 Verification - Tables created:', result.rows.map(r => r.table_name));

    client.release();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
applySmartWarningMigration()
  .then(() => {
    console.log('🎉 Smart Warning System Ready!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });