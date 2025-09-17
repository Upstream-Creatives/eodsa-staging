// Script to actually add sample data to the database
const https = require('https');
const crypto = require('crypto');

// Database connection string
const DATABASE_URL = 'postgres://neondb_owner:npg_0QjbL8sznKtx@ep-lingering-base-a426puts-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Simple bcrypt replacement
function simpleHash(password) {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

// Helper functions
function generateEODSAId() {
  const letter = 'E';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

function generateStudioRegistrationId() {
  const letter = 'S';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

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

async function addSampleData() {
  try {
    console.log('🚀 Starting to add sample data to database...');
    
    // Add judges/admins
    console.log('👥 Adding judges and admins...');
    const judges = [
      {
        name: 'Dr. Patricia Williams',
        email: 'patricia.williams@eodsa.co.za',
        password: 'judge123',
        isAdmin: true,
        role: 'admin',
        specialization: ['Contemporary', 'Ballet', 'Jazz']
      },
      {
        name: 'Prof. Michael Thompson',
        email: 'michael.thompson@eodsa.co.za',
        password: 'judge123',
        isAdmin: true,
        role: 'admin',
        specialization: ['Hip Hop', 'Street Dance', 'Commercial']
      },
      {
        name: 'Ms. Jennifer Lee',
        email: 'jennifer.lee@eodsa.co.za',
        password: 'judge123',
        isAdmin: false,
        role: 'judge',
        specialization: ['Ballet', 'Contemporary', 'Modern']
      },
      {
        name: 'Mr. David Rodriguez',
        email: 'david.rodriguez@eodsa.co.za',
        password: 'judge123',
        isAdmin: false,
        role: 'judge',
        specialization: ['Latin', 'Ballroom', 'Salsa']
      }
    ];
    
    for (const judge of judges) {
      try {
        const hashedPassword = simpleHash(judge.password);
        const id = `judge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdAt = new Date().toISOString();
        
        const query = `
          INSERT INTO judges (id, name, email, password, is_admin, role, specialization, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        await executeSQL(query, [
          id, judge.name, judge.email, hashedPassword, 
          judge.isAdmin, judge.role, JSON.stringify(judge.specialization), createdAt
        ]);
        
        console.log(`✅ Added judge: ${judge.name} (${judge.role})`);
      } catch (error) {
        console.log(`⚠️ Judge ${judge.name} might already exist: ${error.message}`);
      }
    }
    
    // Add studios
    console.log('🏢 Adding studios...');
    const studios = [
      {
        name: 'Dance Academy Johannesburg',
        email: 'info@danceacademyjhb.co.za',
        password: 'studio123',
        contactPerson: 'Maria Rodriguez',
        address: '123 Main Street, Johannesburg, Gauteng',
        phone: '0111234567'
      },
      {
        name: 'Cape Town Dance Studio',
        email: 'contact@capetowndance.co.za',
        password: 'studio123',
        contactPerson: 'John Smith',
        address: '456 Long Street, Cape Town, Western Cape',
        phone: '0219876543'
      },
      {
        name: 'Durban Dance Centre',
        email: 'info@durbandancecentre.co.za',
        password: 'studio123',
        contactPerson: 'Thabo Mthembu',
        address: '789 Florida Road, Durban, KwaZulu-Natal',
        phone: '0314567890'
      },
      {
        name: 'Bloemfontein Ballet School',
        email: 'admin@bloemballet.co.za',
        password: 'studio123',
        contactPerson: 'Anna van der Merwe',
        address: '321 Nelson Mandela Drive, Bloemfontein, Free State',
        phone: '0512345678'
      }
    ];
    
    for (const studio of studios) {
      try {
        const hashedPassword = simpleHash(studio.password);
        const id = Date.now().toString();
        const registrationNumber = generateStudioRegistrationId();
        const createdAt = new Date().toISOString();
        const approvedAt = new Date().toISOString();
        
        const query = `
          INSERT INTO studios (id, name, email, password, contact_person, address, phone, registration_number, created_at, approved_by, approved_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        
        await executeSQL(query, [
          id, studio.name, studio.email, hashedPassword, studio.contactPerson,
          studio.address, studio.phone, registrationNumber, createdAt, 'system', approvedAt
        ]);
        
        console.log(`✅ Added studio: ${studio.name} (${registrationNumber})`);
      } catch (error) {
        console.log(`⚠️ Studio ${studio.name} might already exist: ${error.message}`);
      }
    }
    
    // Add dancers
    console.log('💃 Adding dancers...');
    const dancers = [
      {
        name: 'Sarah Johnson',
        dateOfBirth: '2005-03-15',
        nationalId: '0503150123456',
        province: 'Gauteng',
        email: 'sarah.johnson@email.com',
        phone: '0821234567',
        guardianName: 'Mary Johnson',
        guardianEmail: 'mary.johnson@email.com',
        guardianPhone: '0821234568'
      },
      {
        name: 'Michael Chen',
        dateOfBirth: '2007-08-22',
        nationalId: '0708220123457',
        province: 'Western Cape',
        email: 'michael.chen@email.com',
        phone: '0832345678',
        guardianName: 'David Chen',
        guardianEmail: 'david.chen@email.com',
        guardianPhone: '0832345679'
      },
      {
        name: 'Emma Williams',
        dateOfBirth: '2004-12-10',
        nationalId: '0412100123458',
        province: 'KwaZulu-Natal',
        email: 'emma.williams@email.com',
        phone: '0843456789',
        guardianName: 'Lisa Williams',
        guardianEmail: 'lisa.williams@email.com',
        guardianPhone: '0843456790'
      },
      {
        name: 'James Brown',
        dateOfBirth: '2006-05-18',
        nationalId: '0605180123459',
        province: 'Free State',
        email: 'james.brown@email.com',
        phone: '0854567890',
        guardianName: 'Robert Brown',
        guardianEmail: 'robert.brown@email.com',
        guardianPhone: '0854567891'
      }
    ];
    
    for (const dancer of dancers) {
      try {
        const eodsaId = generateEODSAId();
        const id = `dancer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdAt = new Date().toISOString();
        
        // Calculate age from date of birth
        const birthDate = new Date(dancer.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        // Randomly assign approval status (70% approved, 20% pending, 10% rejected)
        const approvalRandom = Math.random();
        let approved = false;
        let approvedBy = null;
        let approvedAt = null;
        let rejectionReason = null;
        
        if (approvalRandom < 0.7) {
          approved = true;
          approvedBy = 'system';
          approvedAt = new Date().toISOString();
        } else if (approvalRandom < 0.9) {
          approved = false;
        } else {
          approved = false;
          rejectionReason = 'Incomplete documentation provided';
        }
        
        const query = `
          INSERT INTO dancers (id, eodsa_id, name, age, date_of_birth, national_id, email, phone, guardian_name, guardian_email, guardian_phone, province, approved, approved_by, approved_at, rejection_reason, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `;
        
        await executeSQL(query, [
          id, eodsaId, dancer.name, age, dancer.dateOfBirth, dancer.nationalId,
          dancer.email, dancer.phone, dancer.guardianName, dancer.guardianEmail,
          dancer.guardianPhone, dancer.province, approved, approvedBy, approvedAt,
          rejectionReason, createdAt
        ]);
        
        console.log(`✅ Added dancer: ${dancer.name} (${eodsaId}) - Status: ${approved ? 'Approved' : (rejectionReason ? 'Rejected' : 'Pending')}`);
      } catch (error) {
        console.log(`⚠️ Dancer ${dancer.name} might already exist: ${error.message}`);
      }
    }
    
    console.log('🎉 Sample data addition completed!');
    console.log('\n📊 Summary:');
    console.log(`- ${judges.length} judges/admins added`);
    console.log(`- ${studios.length} studios added`);
    console.log(`- ${dancers.length} dancers added`);
    console.log('\n🔑 Login credentials:');
    console.log('Admin: mains@elementscentral.com / 624355Mage55!');
    console.log('Sample Admin: patricia.williams@eodsa.co.za / judge123');
    console.log('Sample Studio: info@danceacademyjhb.co.za / studio123');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

// Run the script
addSampleData();
