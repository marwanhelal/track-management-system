import { query, closeConnection } from '../database/connection';

async function checkAuditFunction() {
  try {
    console.log('Checking audit_table_changes function...\n');

    // Get the function definition
    const result = await query(`
      SELECT pg_get_functiondef(oid) as function_def
      FROM pg_proc
      WHERE proname = 'audit_table_changes'
    `);

    if (result.rows.length > 0) {
      console.log('Current function definition:');
      console.log(result.rows[0].function_def);
    } else {
      console.log('Function audit_table_changes not found');
    }

    // Also check for any triggers using this function on project_phases
    const triggers = await query(`
      SELECT tgname, tgenabled
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'project_phases'
        AND tgname LIKE '%audit%'
    `);

    console.log('\n\nAudit triggers on project_phases:');
    console.log(triggers.rows);

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await closeConnection();
    process.exit(1);
  }
}

checkAuditFunction();
