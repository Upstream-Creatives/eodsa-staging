const { neon } = require('@neondatabase/serverless');

async function testDatabase() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔍 Looking for admin users...');
    const admins = await sql`SELECT id, name, email, is_admin FROM judges WHERE email LIKE '%admin%'`;
    console.log('Found admin users:', admins);
    
    console.log('\n🔍 Looking for exact email admin@eodsa.com...');
    const exact = await sql`SELECT id, name, email, is_admin FROM judges WHERE email = 'admin@eodsa.com'`;
    console.log('Found exact match:', exact);
    
    console.log('\n🔍 All judges:');
    const all = await sql`SELECT id, name, email, is_admin FROM judges LIMIT 10`;
    console.log('All judges:', all);
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

testDatabase();

