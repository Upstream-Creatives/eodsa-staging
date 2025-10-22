const { getSql } = require('./lib/database.ts');

async function checkIssues() {
  console.log('🔍 Investigating the issues...\n');
  
  try {
    const sqlClient = getSql();
    
    // Check Item 44 (Triple scoop)
    console.log('1. Checking Item 44 (Triple scoop):');
    const item44 = await sqlClient`SELECT * FROM event_entries WHERE item_number = 44`;
    if (item44.length > 0) {
      console.log('Found Item 44:', JSON.stringify(item44[0], null, 2));
    } else {
      console.log('Item 44 not found');
    }
    
    // Check Item 6 scoring status
    console.log('\n2. Checking Item 6 scoring status:');
    const item6 = await sqlClient`SELECT * FROM event_entries WHERE item_number = 6`;
    if (item6.length > 0) {
      console.log('Found Item 6:', JSON.stringify(item6[0], null, 2));
      
      // Check scores for Item 6
      const scores6 = await sqlClient`SELECT * FROM scores WHERE performance_id IN (SELECT id FROM performances WHERE event_entry_id = ${item6[0].id})`;
      console.log('Scores for Item 6:', scores6.length);
    }
    
    // Check Item 64 (Me too)
    console.log('\n3. Checking Item 64 (Me too):');
    const item64 = await sqlClient`SELECT * FROM event_entries WHERE item_number = 64`;
    if (item64.length > 0) {
      console.log('Found Item 64:', JSON.stringify(item64[0], null, 2));
    } else {
      console.log('Item 64 not found');
    }
    
    // Check MOVE Dance Company entries
    console.log('\n4. Checking MOVE Dance Company entries:');
    const moveEntries = await sqlClient`SELECT * FROM event_entries WHERE contestant_name ILIKE '%MOVE%' OR studio_name ILIKE '%MOVE%'`;
    console.log('MOVE Dance Company entries:', moveEntries.length);
    if (moveEntries.length > 0) {
      console.log('Sample MOVE entry:', JSON.stringify(moveEntries[0], null, 2));
    }
    
    // Check legacy entries
    console.log('\n5. Checking legacy entries:');
    const legacyEntries = await sqlClient`SELECT * FROM event_entries WHERE contestant_name = 'Legacy Entry' OR studio_name = 'Legacy Entry'`;
    console.log('Legacy entries count:', legacyEntries.length);
    
    // Check certificates for these items
    console.log('\n6. Checking certificates:');
    const certificates = await sqlClient`SELECT * FROM certificates WHERE performance_id IN (SELECT id FROM performances WHERE event_entry_id IN (SELECT id FROM event_entries WHERE item_number IN (44, 6, 64)))`;
    console.log('Certificates for items 44, 6, 64:', certificates.length);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkIssues();
