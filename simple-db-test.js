const { Client } = require('pg');

async function testConnection() {
  // Try different password configurations
  const configs = [
    {
      host: 'localhost',
      port: 5432,
      database: 'track_management',
      user: 'postgres',
      password: '25180047m5'
    },
    {
      host: 'localhost',
      port: 5432,
      database: 'postgres', // Try default database first
      user: 'postgres',
      password: '25180047m5'
    }
  ];

  for (const [index, config] of configs.entries()) {
    console.log(`\n🔧 Test ${index + 1}: Connecting to ${config.database}...`);

    const client = new Client(config);

    try {
      await client.connect();
      console.log('✅ Connection successful!');

      const result = await client.query('SELECT version()');
      console.log('📋 PostgreSQL Version:', result.rows[0].version.substring(0, 50) + '...');

      // If connected to postgres database, check if track_management exists
      if (config.database === 'postgres') {
        const dbCheck = await client.query(
          "SELECT datname FROM pg_database WHERE datname = 'track_management'"
        );
        console.log(`📊 track_management database exists: ${dbCheck.rows.length > 0}`);
      } else {
        // Check tables in track_management
        const tableCheck = await client.query(
          "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
        );
        console.log(`📊 Tables in database: ${tableCheck.rows[0].table_count}`);
      }

      await client.end();
      console.log('✅ Test passed!\n');
      return true;

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);

      try {
        await client.end();
      } catch (e) {
        // Ignore close errors
      }

      if (index === configs.length - 1) {
        console.error('\n💡 All connection attempts failed. Please check:');
        console.error('   - PostgreSQL is running');
        console.error('   - User "postgres" exists');
        console.error('   - Password is correct');
        console.error('   - Database permissions are set correctly');
        return false;
      }
    }
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});