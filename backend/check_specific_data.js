const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25180047m5',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function checkSpecificData() {
  const pool = new Pool(config);
  try {
    const client = await pool.connect();

    // Get the actual notifications that are causing issues
    const result = await client.query(`
      SELECT id, type, data, created_at
      FROM notifications
      WHERE user_id = 12
      AND is_dismissed = false
      AND data IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('Recent notifications with data:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Type: ${row.type}`);
      console.log(`   Data type: ${typeof row.data}`);
      console.log(`   Data value:`, row.data);
      console.log(`   Data toString:`, row.data?.toString());
      console.log(`   Is string?`, typeof row.data === 'string');
      console.log(`   Is object?`, typeof row.data === 'object');
      console.log('---');
    });

    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSpecificData();