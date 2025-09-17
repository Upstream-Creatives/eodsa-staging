// Script to verify the data was actually added
const { neon } = require('@neondatabase/serverless');

// Database connection
const DATABASE_URL = 'postgres://neondb_owner:npg_0QjbL8sznKtx@ep-lingering-base-a426puts-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function verifyData() {
  try {
    console.log('🔍 Verifying data was actually added to database...');
    
    // Check judges
    console.log('\n👥 Checking judges table:');
    const judgesCount = await sql`SELECT COUNT(*) as count FROM judges`;
    console.log(`Total judges: ${judgesCount[0].count}`);
    
    const judgesList = await sql`SELECT name, email, role FROM judges ORDER BY created_at DESC LIMIT 5`;
    console.log('Recent judges:');
    judgesList.forEach(judge => {
      console.log(`  - ${judge.name} (${judge.email}) - ${judge.role}`);
    });
    
    // Check studios
    console.log('\n🏢 Checking studios table:');
    const studiosCount = await sql`SELECT COUNT(*) as count FROM studios`;
    console.log(`Total studios: ${studiosCount[0].count}`);
    
    const studiosList = await sql`SELECT name, email, registration_number FROM studios ORDER BY created_at DESC LIMIT 5`;
    console.log('Recent studios:');
    studiosList.forEach(studio => {
      console.log(`  - ${studio.name} (${studio.email}) - ${studio.registration_number}`);
    });
    
    // Check dancers
    console.log('\n💃 Checking dancers table:');
    const dancersCount = await sql`SELECT COUNT(*) as count FROM dancers`;
    console.log(`Total dancers: ${dancersCount[0].count}`);
    
    const dancersList = await sql`SELECT name, eodsa_id, approved FROM dancers ORDER BY created_at DESC LIMIT 5`;
    console.log('Recent dancers:');
    dancersList.forEach(dancer => {
      console.log(`  - ${dancer.name} (${dancer.eodsa_id}) - ${dancer.approved ? 'Approved' : 'Pending'}`);
    });
    
    console.log('\n✅ Database verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying database:', error);
  }
}

// Run the verification
verifyData();
