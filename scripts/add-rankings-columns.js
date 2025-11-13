/**
 * Migration Script: Add Rankings API Required Columns
 * Adds performance_type and age_category columns to event_entries table
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('❌ Make sure .env.local exists and contains DATABASE_URL');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function addRankingsColumns() {
  try {
    console.log('🚀 Starting rankings columns migration...\n');

    // Add performance_type column to event_entries table
    console.log('📝 Adding performance_type column to event_entries...');
    await sql`
      ALTER TABLE event_entries 
      ADD COLUMN IF NOT EXISTS performance_type TEXT
    `;
    console.log('✅ Added performance_type column');

    // Add age_category column to event_entries table
    console.log('📝 Adding age_category column to event_entries...');
    await sql`
      ALTER TABLE event_entries 
      ADD COLUMN IF NOT EXISTS age_category TEXT
    `;
    console.log('✅ Added age_category column');

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

addRankingsColumns();

