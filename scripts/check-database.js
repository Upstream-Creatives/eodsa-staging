// Script to check what's actually in the database
const https = require('https');

// Database connection string
const DATABASE_URL = 'postgres://neondb_owner:npg_0QjbL8sznKtx@ep-lingering-base-a426puts-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Function to execute SQL via Neon's HTTP API
async function executeSQL(query, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(DATABASE_URL);
    const hostname = url.hostname;
    const port = url.port || 5432;
    
    // Parse the connection string
    const dbName = url.pathname.substring(1);
    const username = url.username;
    const password = url.password;
    
    // Create the SQL query payload
    const payload = JSON.stringify({
      query: query,
      params: params
    });
    
    const options = {
      hostname: hostname,
      port: 443,
      path: `/sql`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(payload);
    req.end();
  });
}

async function checkDatabase() {
  try {
    console.log('🔍 Checking what\'s actually in the database...');
    
    // Check judges
    console.log('\n👥 Checking judges table:');
    try {
      const judgesResult = await executeSQL('SELECT COUNT(*) as count FROM judges');
      console.log(`Judges count: ${JSON.stringify(judgesResult)}`);
      
      const judgesList = await executeSQL('SELECT name, email, role FROM judges LIMIT 10');
      console.log('Sample judges:', JSON.stringify(judgesList, null, 2));
    } catch (error) {
      console.log('Error checking judges:', error.message);
    }
    
    // Check studios
    console.log('\n🏢 Checking studios table:');
    try {
      const studiosResult = await executeSQL('SELECT COUNT(*) as count FROM studios');
      console.log(`Studios count: ${JSON.stringify(studiosResult)}`);
      
      const studiosList = await executeSQL('SELECT name, email, registration_number FROM studios LIMIT 10');
      console.log('Sample studios:', JSON.stringify(studiosList, null, 2));
    } catch (error) {
      console.log('Error checking studios:', error.message);
    }
    
    // Check dancers
    console.log('\n💃 Checking dancers table:');
    try {
      const dancersResult = await executeSQL('SELECT COUNT(*) as count FROM dancers');
      console.log(`Dancers count: ${JSON.stringify(dancersResult)}`);
      
      const dancersList = await executeSQL('SELECT name, eodsa_id, approved FROM dancers LIMIT 10');
      console.log('Sample dancers:', JSON.stringify(dancersList, null, 2));
    } catch (error) {
      console.log('Error checking dancers:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Run the check
checkDatabase();
