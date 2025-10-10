const API_URL = 'http://localhost:5005/api/v1';

const accounts = [
  // CEO (Supervisor)
  { name: 'Hesham Helal', email: 'hesham.helal@criteria.com', role: 'supervisor', job: 'Chairman of the Board' },

  // Managers (Supervisors)
  { name: 'Marwa Farrag', email: 'marwa.farrag@criteria.com', role: 'supervisor', job: 'Manager' },
  { name: 'Rania Fouad', email: 'rania.fouad@criteria.com', role: 'supervisor', job: 'Manager' },
  { name: 'Nehal Al Lithy', email: 'nehal.allithy@criteria.com', role: 'supervisor', job: 'Manager' },
  { name: 'Rehab Ali', email: 'rehab.ali@criteria.com', role: 'supervisor', job: 'Manager' },

  // Engineers
  { name: 'Mohamed El Fakhrany', email: 'mohamed.elfakhrany@criteria.com', role: 'engineer', job: 'Engineer' },
  { name: 'Mahmoud Mourad', email: 'mahmoud.mourad@criteria.com', role: 'engineer', job: 'Engineer' },
  { name: 'Omar Tarek', email: 'omar.tarek@criteria.com', role: 'engineer', job: 'Engineer' },
  { name: 'Simon Samy', email: 'simon.samy@criteria.com', role: 'engineer', job: 'Engineer' },
  { name: 'Asmaa Farouk', email: 'asmaa.farouk@criteria.com', role: 'engineer', job: 'Engineer' },
  { name: 'Norhan Said', email: 'norhan.said@criteria.com', role: 'engineer', job: 'Engineer' },
  { name: 'Mohamed Baiumy', email: 'mohamed.baiumy@criteria.com', role: 'engineer', job: 'Engineer' },

  // Administrators
  { name: 'Amany Adham', email: 'amany.adham@criteria.com', role: 'administrator', job: 'Administrator' },
  { name: 'Ramy Saria', email: 'ramy.saria@criteria.com', role: 'administrator', job: 'Administrator' },
  { name: 'Mohamed Ahmed', email: 'mohamed.ahmed@criteria.com', role: 'administrator', job: 'Administrator' },
  { name: 'Hadeer Mahmoud', email: 'hadeer.mahmoud@criteria.com', role: 'administrator', job: 'Administrator' }
];

async function testLogin(account) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: account.email,
        password: 'password123'
      })
    });

    const data = await response.json();

    if (data.success) {
      const user = data.data.user;
      const roleMatch = user.role === account.role;
      const jobMatch = user.job_description === account.job;

      return {
        success: true,
        name: account.name,
        email: account.email,
        role: user.role,
        roleMatch,
        jobDescription: user.job_description,
        jobMatch,
        isActive: user.is_active
      };
    } else {
      return {
        success: false,
        name: account.name,
        email: account.email,
        error: data.error || 'Login failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      name: account.name,
      email: account.email,
      error: error.message
    };
  }
}

async function testAllLogins() {
  console.log('🧪 Testing All 16 Account Logins...\n');
  console.log('='.repeat(80));

  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  // Test CEO
  console.log('\n👔 CEO (1):');
  console.log('-'.repeat(80));
  let result = await testLogin(accounts[0]);
  if (result.success && result.roleMatch && result.jobMatch) {
    console.log(`✅ ${result.name} - ${result.email}`);
    console.log(`   Role: ${result.role} | Job: ${result.jobDescription} | Active: ${result.isActive}`);
    successCount++;
  } else {
    console.log(`❌ ${result.name} - ${result.email}`);
    console.log(`   Error: ${result.error || 'Role/Job mismatch'}`);
    if (!result.roleMatch) console.log(`   Expected role: supervisor, Got: ${result.role}`);
    if (!result.jobMatch) console.log(`   Expected job: Chairman of the Board, Got: ${result.jobDescription}`);
    failureCount++;
    failures.push(result);
  }

  // Test Managers
  console.log('\n👨‍💼 Managers (4 - Supervisors):');
  console.log('-'.repeat(80));
  for (let i = 1; i <= 4; i++) {
    result = await testLogin(accounts[i]);
    if (result.success && result.roleMatch && result.jobMatch) {
      console.log(`✅ ${result.name} - ${result.email}`);
      console.log(`   Role: ${result.role} | Job: ${result.jobDescription} | Active: ${result.isActive}`);
      successCount++;
    } else {
      console.log(`❌ ${result.name} - ${result.email}`);
      console.log(`   Error: ${result.error || 'Role/Job mismatch'}`);
      if (!result.roleMatch) console.log(`   Expected role: supervisor, Got: ${result.role}`);
      if (!result.jobMatch) console.log(`   Expected job: Manager, Got: ${result.jobDescription}`);
      failureCount++;
      failures.push(result);
    }
  }

  // Test Engineers
  console.log('\n👷 Engineers (7):');
  console.log('-'.repeat(80));
  for (let i = 5; i <= 11; i++) {
    result = await testLogin(accounts[i]);
    if (result.success && result.roleMatch && result.jobMatch) {
      console.log(`✅ ${result.name} - ${result.email}`);
      console.log(`   Role: ${result.role} | Job: ${result.jobDescription} | Active: ${result.isActive}`);
      successCount++;
    } else {
      console.log(`❌ ${result.name} - ${result.email}`);
      console.log(`   Error: ${result.error || 'Role/Job mismatch'}`);
      if (!result.roleMatch) console.log(`   Expected role: engineer, Got: ${result.role}`);
      if (!result.jobMatch) console.log(`   Expected job: Engineer, Got: ${result.jobDescription}`);
      failureCount++;
      failures.push(result);
    }
  }

  // Test Administrators
  console.log('\n🔐 Administrators (4 - Read-only):');
  console.log('-'.repeat(80));
  for (let i = 12; i <= 15; i++) {
    result = await testLogin(accounts[i]);
    if (result.success && result.roleMatch && result.jobMatch) {
      console.log(`✅ ${result.name} - ${result.email}`);
      console.log(`   Role: ${result.role} | Job: ${result.jobDescription} | Active: ${result.isActive}`);
      successCount++;
    } else {
      console.log(`❌ ${result.name} - ${result.email}`);
      console.log(`   Error: ${result.error || 'Role/Job mismatch'}`);
      if (!result.roleMatch) console.log(`   Expected role: administrator, Got: ${result.role}`);
      if (!result.jobMatch) console.log(`   Expected job: Administrator, Got: ${result.jobDescription}`);
      failureCount++;
      failures.push(result);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Accounts: ${accounts.length}`);
  console.log(`✅ Successful Logins: ${successCount}`);
  console.log(`❌ Failed Logins: ${failureCount}`);

  if (failureCount > 0) {
    console.log('\n⚠️ Failed Accounts:');
    failures.forEach(f => {
      console.log(`   - ${f.name} (${f.email}): ${f.error || 'Validation failed'}`);
    });
  } else {
    console.log('\n🎉 All accounts verified successfully!');
  }

  console.log('='.repeat(80));
}

testAllLogins().catch(console.error);
