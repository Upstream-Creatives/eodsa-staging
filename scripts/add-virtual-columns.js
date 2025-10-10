// Add virtual entry columns to performances table
// Run with: node scripts/add-virtual-columns.js

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const sql = neon(process.env.DATABASE_URL);

async function addVirtualColumns() {
  console.log('🔧 Adding virtual entry support columns to performances table...\n');

  try {
    await sql`ALTER TABLE performances ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'live'`;
    console.log('✅ Added entry_type column');

    await sql`ALTER TABLE performances ADD COLUMN IF NOT EXISTS video_external_url TEXT`;
    console.log('✅ Added video_external_url column');

    await sql`ALTER TABLE performances ADD COLUMN IF NOT EXISTS video_external_type TEXT`;
    console.log('✅ Added video_external_type column');

    await sql`ALTER TABLE performances ADD COLUMN IF NOT EXISTS music_file_url TEXT`;
    console.log('✅ Added music_file_url column');

    await sql`ALTER TABLE performances ADD COLUMN IF NOT EXISTS music_file_name TEXT`;
    console.log('✅ Added music_file_name column');

    console.log('\n✅ All columns added successfully!');
    console.log('Now run: node scripts/fix-virtual-performances.js');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addVirtualColumns();
