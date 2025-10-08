/**
 * Entry Count Verification Script
 * 
 * This script checks all entry-related tables and provides a detailed breakdown
 * to help diagnose count discrepancies between entries and performances.
 */

const { neon } = require('@neondatabase/serverless');

async function verifyEntryCounts() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('\n🔍 DATABASE ENTRY COUNT VERIFICATION');
  console.log('=' .repeat(80));
  console.log('\n');

  try {
    // 1. Count entries in event_entries table
    console.log('📊 EVENT_ENTRIES TABLE:');
    console.log('-'.repeat(80));
    
    const eventEntriesTotal = await sql`
      SELECT COUNT(*) as count FROM event_entries
    `;
    console.log(`Total entries in event_entries: ${eventEntriesTotal[0].count}`);

    const eventEntriesByType = await sql`
      SELECT 
        entry_type,
        COUNT(*) as count
      FROM event_entries
      GROUP BY entry_type
      ORDER BY entry_type
    `;
    console.log('\nBreakdown by entry type:');
    eventEntriesByType.forEach(row => {
      console.log(`  - ${row.entry_type || 'NULL/undefined'}: ${row.count}`);
    });

    const eventEntriesByEvent = await sql`
      SELECT 
        e.name as event_name,
        ee.entry_type,
        COUNT(*) as count
      FROM event_entries ee
      LEFT JOIN events e ON e.id = ee.event_id
      GROUP BY e.name, ee.entry_type
      ORDER BY e.name, ee.entry_type
    `;
    console.log('\nBreakdown by event:');
    eventEntriesByEvent.forEach(row => {
      console.log(`  - ${row.event_name}: ${row.entry_type || 'NULL'} = ${row.count}`);
    });

    // 2. Count entries in nationals_event_entries table
    console.log('\n\n📊 NATIONALS_EVENT_ENTRIES TABLE:');
    console.log('-'.repeat(80));
    
    const nationalsEntriesTotal = await sql`
      SELECT COUNT(*) as count FROM nationals_event_entries
    `;
    console.log(`Total entries in nationals_event_entries: ${nationalsEntriesTotal[0].count}`);

    const nationalsEntriesByEvent = await sql`
      SELECT 
        nationals_event_id,
        COUNT(*) as count
      FROM nationals_event_entries
      GROUP BY nationals_event_id
      ORDER BY nationals_event_id
    `;
    console.log('\nBreakdown by nationals event:');
    nationalsEntriesByEvent.forEach(row => {
      console.log(`  - Nationals Event ${row.nationals_event_id}: ${row.count}`);
    });

    // Note: nationals_event_entries doesn't have entry_type, they are all virtual
    console.log('\n⚠️  Note: All nationals entries are VIRTUAL (no entry_type field in table)');

    // 3. Combined total
    console.log('\n\n📊 COMBINED TOTALS:');
    console.log('-'.repeat(80));
    const totalRegularEntries = parseInt(eventEntriesTotal[0].count);
    const totalNationalsEntries = parseInt(nationalsEntriesTotal[0].count);
    const grandTotal = totalRegularEntries + totalNationalsEntries;
    
    console.log(`Regular entries (event_entries):    ${totalRegularEntries}`);
    console.log(`Nationals entries (nationals):       ${totalNationalsEntries}`);
    console.log(`GRAND TOTAL:                         ${grandTotal}`);

    // 4. Count by entry type (combined)
    console.log('\n\n📊 ENTRY TYPE BREAKDOWN (COMBINED):');
    console.log('-'.repeat(80));
    
    const liveCount = eventEntriesByType.find(r => r.entry_type === 'live')?.count || 0;
    const virtualInRegular = eventEntriesByType.find(r => r.entry_type === 'virtual')?.count || 0;
    const nullEntryType = eventEntriesByType.find(r => !r.entry_type)?.count || 0;
    const totalVirtual = parseInt(virtualInRegular) + totalNationalsEntries;
    
    console.log(`Live entries:                        ${liveCount}`);
    console.log(`Virtual entries (event_entries):     ${virtualInRegular}`);
    console.log(`Virtual entries (nationals):         ${totalNationalsEntries}`);
    console.log(`TOTAL VIRTUAL:                       ${totalVirtual}`);
    if (nullEntryType > 0) {
      console.log(`⚠️  NULL/undefined entry_type:        ${nullEntryType}`);
    }

    // 5. Count performances
    console.log('\n\n📊 PERFORMANCES TABLE:');
    console.log('-'.repeat(80));
    
    const performancesTotal = await sql`
      SELECT COUNT(*) as count FROM performances
    `;
    console.log(`Total performances: ${performancesTotal[0].count}`);

    const performancesByEvent = await sql`
      SELECT 
        e.name as event_name,
        COUNT(*) as count
      FROM performances p
      LEFT JOIN events e ON e.id = p.event_id
      GROUP BY e.name
      ORDER BY e.name
    `;
    console.log('\nBreakdown by event:');
    performancesByEvent.forEach(row => {
      console.log(`  - ${row.event_name}: ${row.count}`);
    });

    // 6. Check for entries without performances
    console.log('\n\n📊 ENTRIES WITHOUT PERFORMANCES:');
    console.log('-'.repeat(80));
    
    const regularEntriesWithoutPerf = await sql`
      SELECT 
        ee.id,
        ee.item_name,
        ee.entry_type,
        e.name as event_name,
        ee.approved
      FROM event_entries ee
      LEFT JOIN performances p ON p.event_entry_id = ee.id
      LEFT JOIN events e ON e.id = ee.event_id
      WHERE p.id IS NULL
      ORDER BY ee.created_at DESC
    `;
    
    console.log(`Regular entries without performance: ${regularEntriesWithoutPerf.length}`);
    if (regularEntriesWithoutPerf.length > 0 && regularEntriesWithoutPerf.length <= 20) {
      console.log('\nDetails:');
      regularEntriesWithoutPerf.forEach(entry => {
        console.log(`  - ${entry.item_name} (${entry.entry_type || 'NULL'}) - Event: ${entry.event_name} - Approved: ${entry.approved}`);
      });
    } else if (regularEntriesWithoutPerf.length > 20) {
      console.log('\nShowing first 20:');
      regularEntriesWithoutPerf.slice(0, 20).forEach(entry => {
        console.log(`  - ${entry.item_name} (${entry.entry_type || 'NULL'}) - Event: ${entry.event_name} - Approved: ${entry.approved}`);
      });
      console.log(`  ... and ${regularEntriesWithoutPerf.length - 20} more`);
    }

    const nationalsEntriesWithoutPerf = await sql`
      SELECT 
        ne.id,
        ne.item_name
      FROM nationals_event_entries ne
      LEFT JOIN performances p ON p.nationals_entry_id = ne.id
      WHERE p.id IS NULL
      ORDER BY ne.created_at DESC
    `;
    
    console.log(`\nNationals entries without performance: ${nationalsEntriesWithoutPerf.length}`);
    if (nationalsEntriesWithoutPerf.length > 0 && nationalsEntriesWithoutPerf.length <= 20) {
      console.log('\nDetails:');
      nationalsEntriesWithoutPerf.forEach(entry => {
        console.log(`  - ${entry.item_name}`);
      });
    } else if (nationalsEntriesWithoutPerf.length > 20) {
      console.log('\nShowing first 20:');
      nationalsEntriesWithoutPerf.slice(0, 20).forEach(entry => {
        console.log(`  - ${entry.item_name}`);
      });
      console.log(`  ... and ${nationalsEntriesWithoutPerf.length - 20} more`);
    }

    // 7. Check for performances without entries (orphaned)
    console.log('\n\n📊 ORPHANED PERFORMANCES:');
    console.log('-'.repeat(80));
    
    const orphanedPerformances = await sql`
      SELECT 
        p.id,
        p.title,
        p.event_entry_id,
        p.nationals_entry_id
      FROM performances p
      LEFT JOIN event_entries ee ON ee.id = p.event_entry_id
      LEFT JOIN nationals_event_entries ne ON ne.id = p.nationals_entry_id
      WHERE ee.id IS NULL AND ne.id IS NULL
    `;
    
    console.log(`Performances without matching entry: ${orphanedPerformances.length}`);
    if (orphanedPerformances.length > 0 && orphanedPerformances.length <= 20) {
      orphanedPerformances.forEach(perf => {
        console.log(`  - ${perf.title} (ID: ${perf.id}) - event_entry_id: ${perf.event_entry_id}, nationals_entry_id: ${perf.nationals_entry_id}`);
      });
    } else if (orphanedPerformances.length > 0) {
      console.log('\nShowing first 20:');
      orphanedPerformances.slice(0, 20).forEach(perf => {
        console.log(`  - ${perf.title} (ID: ${perf.id})`);
      });
      console.log(`  ... and ${orphanedPerformances.length - 20} more`);
    }

    // 8. Summary Analysis
    console.log('\n\n📊 DISCREPANCY ANALYSIS:');
    console.log('='.repeat(80));
    
    const totalPerformances = parseInt(performancesTotal[0].count);
    const expectedPerformances = grandTotal;
    const missing = expectedPerformances - totalPerformances;
    
    console.log(`Total Entries (should have performances): ${expectedPerformances}`);
    console.log(`Total Performances (actual):               ${totalPerformances}`);
    console.log(`Discrepancy:                               ${missing > 0 ? '+' : ''}${missing}`);
    
    if (missing > 0) {
      console.log(`\n⚠️  ${missing} entries do NOT have performances created!`);
    } else if (missing < 0) {
      console.log(`\n⚠️  ${Math.abs(missing)} EXTRA performances exist without matching entries!`);
    } else {
      console.log(`\n✅ All entries have corresponding performances!`);
    }

    // 9. Entry Type Issues
    if (nullEntryType > 0) {
      console.log(`\n⚠️  WARNING: ${nullEntryType} entries have NULL/undefined entry_type!`);
      console.log('   These entries may not be counted correctly as live or virtual.');
    }

    // 10. Detailed breakdown you asked for
    console.log('\n\n📊 YOUR REPORTED NUMBERS:');
    console.log('='.repeat(80));
    console.log('You mentioned:');
    console.log('  - 109 live entries');
    console.log('  - 79 virtual entries');
    console.log('  - 92 overall performances');
    console.log('  Total expected: 188 entries → 92 performances');
    console.log('');
    console.log('Database shows:');
    console.log(`  - ${liveCount} live entries`);
    console.log(`  - ${totalVirtual} virtual entries (${virtualInRegular} regular + ${totalNationalsEntries} nationals)`);
    console.log(`  - ${totalPerformances} overall performances`);
    console.log(`  Total: ${grandTotal} entries → ${totalPerformances} performances`);
    
    console.log('\n\n📊 POSSIBLE REASONS FOR DISCREPANCY:');
    console.log('='.repeat(80));
    console.log('1. Entries created but performances not synced/created yet');
    console.log('2. Entries with NULL entry_type being miscounted');
    console.log('3. Unapproved entries not having performances');
    console.log('4. Orphaned performances from deleted entries');
    console.log('5. Multiple entries sharing same performance (unlikely)');
    console.log('6. Frontend filtering entries differently than database count');

    console.log('\n\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  verifyEntryCounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { verifyEntryCounts };

