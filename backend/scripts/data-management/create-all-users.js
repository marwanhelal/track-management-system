const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'track_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '25180047m5',
});

const users = [
  // CEO - Supervisor
  {
    name: 'Hesham Helal',
    email: 'hesham.helal@criteria.com',
    password: 'password123',
    role: 'supervisor',
    job_description: 'Chairman of the Board'
  },

  // Managers - Supervisors
  {
    name: 'Eng. Marwa Farrag',
    email: 'marwa.farrag@criteria.com',
    password: 'password123',
    role: 'supervisor',
    job_description: 'Manager'
  },
  {
    name: 'Dr. Rania Fouad',
    email: 'rania.fouad@criteria.com',
    password: 'password123',
    role: 'supervisor',
    job_description: 'Manager'
  },
  {
    name: 'Eng. Nehal Al Lithy',
    email: 'nehal.allithy@criteria.com',
    password: 'password123',
    role: 'supervisor',
    job_description: 'Manager'
  },
  {
    name: 'Eng. Rehab Ali',
    email: 'rehab.ali@criteria.com',
    password: 'password123',
    role: 'supervisor',
    job_description: 'Manager'
  },

  // Engineers
  {
    name: 'Eng. Mohamed El Fakhrany',
    email: 'mohamed.elfakhrany@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },
  {
    name: 'Eng. Mahmoud Mourad',
    email: 'mahmoud.mourad@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },
  {
    name: 'Eng. Omar Tarek',
    email: 'omar.tarek@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },
  {
    name: 'Eng. Simon Samy',
    email: 'simon.samy@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },
  {
    name: 'Eng. Asmaa Farouk',
    email: 'asmaa.farouk@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },
  {
    name: 'Eng. Norhan Said',
    email: 'norhan.said@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },
  {
    name: 'Eng. Mohamed Baiumy',
    email: 'mohamed.baiumy@criteria.com',
    password: 'password123',
    role: 'engineer',
    job_description: 'Engineer'
  },

  // Administrators
  {
    name: 'Mrs. Amany Adham',
    email: 'amany.adham@criteria.com',
    password: 'password123',
    role: 'administrator',
    job_description: 'Administrator'
  },
  {
    name: 'Mr. Ramy Saria',
    email: 'ramy.saria@criteria.com',
    password: 'password123',
    role: 'administrator',
    job_description: 'Administrator'
  },
  {
    name: 'Mr. Mohamed Ahmed',
    email: 'mohamed.ahmed@criteria.com',
    password: 'password123',
    role: 'administrator',
    job_description: 'Administrator'
  },
  {
    name: 'Mrs. Hadeer Mahmoud',
    email: 'hadeer.mahmoud@criteria.com',
    password: 'password123',
    role: 'administrator',
    job_description: 'Administrator'
  }
];

async function createUsers() {
  const client = await pool.connect();
  try {
    console.log('Starting user creation process...\n');

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id, email FROM users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`⏭️  Skipped: ${user.name} (${user.email}) - already exists`);
        skipped++;
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Create user
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, job_description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, job_description`,
        [user.name, user.email, passwordHash, user.role, user.job_description]
      );

      const newUser = result.rows[0];
      console.log(`✅ Created: ${newUser.name} (${newUser.email})`);
      console.log(`   Role: ${newUser.role} | Job: ${newUser.job_description}\n`);
      created++;
    }

    console.log('=' . repeat(60));
    console.log(`\n✅ User creation completed!`);
    console.log(`   Created: ${created} users`);
    console.log(`   Skipped: ${skipped} users (already exist)`);
    console.log(`   Total: ${created + skipped} users\n`);
    console.log('=' . repeat(60));
    console.log('\n📝 Summary by Role:');

    const summary = await client.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY role
    `);

    summary.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count} users`);
    });

    console.log('\n🔐 Default credentials:');
    console.log('   Email: [firstname.lastname]@criteria.com');
    console.log('   Password: password123');
    console.log('\n⚠️  Please remind users to change their passwords after first login!\n');

  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
