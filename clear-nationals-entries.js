require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function clearNationalsEntries() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    return;
  }
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🗑️  Clearing all nationals data...');
    
    // Delete in the correct order to avoid foreign key constraint violations
    
    // 1. Delete all nationals event entries first (child table)
    const entriesResult = await sql`DELETE FROM nationals_event_entries`;
    console.log(`✅ Deleted ${entriesResult.rowCount || 0} nationals entries`);
    
    // 2. Delete nationals judge assignments (child table)
    const judgeResult = await sql`DELETE FROM nationals_judge_assignments`;
    console.log(`✅ Deleted ${judgeResult.rowCount || 0} nationals judge assignments`);
    
    // 3. Finally delete all nationals events (parent table)
    const eventsResult = await sql`DELETE FROM nationals_events`;
    console.log(`✅ Deleted ${eventsResult.rowCount || 0} nationals events`);
    
    console.log('🎉 Nationals database cleared successfully! Ready for fresh start.');
  } catch (error) {
    console.error('❌ Error clearing nationals data:', error);
  }
}

clearNationalsEntries(); 