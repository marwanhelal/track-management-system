const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25180047m5',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function checkAndFixTable() {
  const pool = new Pool(config);

  try {
    console.log('🔗 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database successfully');

    // Check if notifications table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
      );
    `);

    console.log('📋 Notifications table exists:', tableExists.rows[0].exists);

    if (tableExists.rows[0].exists) {
      // Get current table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        ORDER BY ordinal_position
      `);

      console.log('\n📝 Current table structure:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });

      // Check if urgency column exists
      const urgencyExists = columns.rows.find(row => row.column_name === 'urgency');

      if (!urgencyExists) {
        console.log('\n⚠️  Missing urgency column, adding it...');
        await client.query(`
          ALTER TABLE notifications
          ADD COLUMN urgency VARCHAR(20) NOT NULL DEFAULT 'info'
          CHECK (urgency IN ('critical', 'urgent', 'warning', 'info'))
        `);
        console.log('✅ Added urgency column');
      }

      // Check if other missing columns exist and add them
      const requiredColumns = [
        { name: 'type', type: 'VARCHAR(50)', nullable: false, default: "'system'" },
        { name: 'title', type: 'VARCHAR(255)', nullable: false, default: "'Notification'" },
        { name: 'message', type: 'TEXT', nullable: false, default: "''" },
        { name: 'context', type: 'TEXT', nullable: true },
        { name: 'icon', type: 'VARCHAR(50)', nullable: true },
        { name: 'project_id', type: 'INTEGER', nullable: true },
        { name: 'phase_id', type: 'INTEGER', nullable: true },
        { name: 'work_log_id', type: 'INTEGER', nullable: true },
        { name: 'data', type: 'JSONB', nullable: true },
        { name: 'action_required', type: 'BOOLEAN', nullable: true, default: 'false' },
        { name: 'is_read', type: 'BOOLEAN', nullable: true, default: 'false' },
        { name: 'is_dismissed', type: 'BOOLEAN', nullable: true, default: 'false' },
        { name: 'priority_score', type: 'INTEGER', nullable: true, default: '0' },
        { name: 'expires_at', type: 'TIMESTAMP', nullable: true },
        { name: 'read_at', type: 'TIMESTAMP', nullable: true },
        { name: 'dismissed_at', type: 'TIMESTAMP', nullable: true }
      ];

      for (const col of requiredColumns) {
        const exists = columns.rows.find(row => row.column_name === col.name);
        if (!exists) {
          console.log(`⚠️  Missing ${col.name} column, adding it...`);
          let alterSQL = `ALTER TABLE notifications ADD COLUMN ${col.name} ${col.type}`;

          if (!col.nullable) {
            alterSQL += ` NOT NULL`;
          }

          if (col.default) {
            alterSQL += ` DEFAULT ${col.default}`;
          }

          await client.query(alterSQL);
          console.log(`✅ Added ${col.name} column`);
        }
      }

      // Now check final structure
      const finalColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        ORDER BY ordinal_position
      `);

      console.log('\n📝 Final table structure:');
      finalColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });

    } else {
      console.log('❌ Notifications table does not exist');
    }

    client.release();
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed');
  }
}

checkAndFixTable().catch(console.error);