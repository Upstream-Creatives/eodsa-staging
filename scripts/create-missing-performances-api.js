/**
 * Create Missing Performances via API
 * 
 * Uses the existing sync API endpoint to create performances
 * for the 79 approved entries that are missing them.
 */

async function createMissingPerformances() {
  const eventId = 'event-1752784229267'; // NATIONALS 2025
  
  console.log('\n🔧 Creating missing performances for NATIONALS 2025');
  console.log('Event ID:', eventId);
  console.log('=' .repeat(80));
  console.log('\n');

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/api/admin/sync-performances-from-entries`;

    console.log(`📡 Calling API: ${endpoint}\n`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API returned ${response.status}: ${error}`);
    }

    const result = await response.json();

    console.log('✅ API Response:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');

    if (result.success) {
      console.log(`🎉 Successfully created ${result.created} performances!`);
      
      if (result.created === 79) {
        console.log('✅ All 79 missing performances have been created!');
      } else if (result.created > 0) {
        console.log(`⚠️  Created ${result.created} performances (expected 79)`);
        console.log('   Some may have already existed or there might be other issues.');
      } else {
        console.log('⚠️  No performances were created - they might already exist.');
      }
    } else {
      console.log('❌ API returned success: false');
      console.log('   Error:', result.error || 'Unknown error');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n');
    console.error('💡 Troubleshooting:');
    console.error('   1. Make sure your development server is running (npm run dev)');
    console.error('   2. Check that DATABASE_URL is set in .env');
    console.error('   3. Verify the API endpoint exists');
    console.error('\n');
    throw error;
  }
}

// Run
createMissingPerformances()
  .then(() => {
    console.log('✅ Complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

