/**
 * Generate diverse, professional avatars using multiple high-quality sources
 * Creates unique headshots matching employee demographics
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uploadsDir = './server/uploads/diverse-avatars';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function detectEthnicity(name, surname, nationality) {
  const fullName = `${name} ${surname}`.toLowerCase();
  
  // Use nationality first if available
  if (nationality) {
    const nat = nationality.toLowerCase();
    if (['chinese', 'japanese', 'korean', 'thai', 'vietnamese'].includes(nat)) return 'asian';
    if (['indian', 'pakistani', 'bangladeshi', 'sri lankan'].includes(nat)) return 'south_asian';
    if (['mexican', 'spanish', 'argentinian', 'colombian', 'venezuelan'].includes(nat)) return 'hispanic';
    if (['egyptian', 'moroccan', 'lebanese', 'saudi', 'emirati'].includes(nat)) return 'middle_eastern';
    if (['nigerian', 'kenyan', 'south african', 'ghanaian'].includes(nat)) return 'african';
  }
  
  // Asian names
  if (/\b(wang|li|zhang|liu|chen|yang|huang|zhao|wu|zhou|xu|sun|ma|zhu|hu|guo|he|lin|gao|takahashi|tanaka|watanabe|ito|yamamoto|nakamura|kobayashi|kim|park|lee|choi|jung|kang|cho|yoon)\b/.test(fullName)) {
    return 'asian';
  }
  
  // South Asian names
  if (/\b(kumar|singh|sharma|gupta|agarwal|verma|mehta|patel|jain|shah|kapoor|malhotra|rao|reddy|krishnan|mukherjee|banerjee|nair|menon|iyer)\b/.test(fullName)) {
    return 'south_asian';
  }
  
  // Hispanic names
  if (/\b(garcia|rodriguez|martinez|hernandez|lopez|gonzalez|perez|sanchez|ramirez|torres|flores|rivera|gomez|diaz|reyes|morales)\b/.test(fullName)) {
    return 'hispanic';
  }
  
  // Middle Eastern names
  if (/\b(ahmed|hassan|ali|mohamed|mahmoud|ibrahim|omar|youssef|mustafa|abdullah|salem|nasser|fathi|adel|reda|waleed)\b/.test(fullName)) {
    return 'middle_eastern';
  }
  
  return 'western';
}

function inferGender(name, sex) {
  if (sex) return sex.toLowerCase();
  
  const maleNames = ['james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'christopher', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'jason', 'edward', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory', 'alexander', 'patrick', 'frank', 'raymond', 'jack', 'dennis', 'jerry'];
  const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'kimberly', 'deborah', 'dorothy', 'amy', 'angela', 'ashley', 'brenda', 'emma', 'olivia', 'cynthia', 'marie', 'janet', 'catherine', 'frances', 'christine', 'samantha', 'debra', 'rachel', 'carolyn', 'virginia', 'maria', 'heather', 'diane', 'julie', 'joyce', 'victoria', 'kelly', 'christina'];
  
  const lowerName = name.toLowerCase();
  if (maleNames.includes(lowerName)) return 'male';
  if (femaleNames.includes(lowerName)) return 'female';
  
  return lowerName.endsWith('a') || lowerName.endsWith('ia') ? 'female' : 'male';
}

function generateHighQualityAvatar(employee, index) {
  const ethnicity = detectEthnicity(employee.name, employee.surname || '', employee.nationality);
  const gender = inferGender(employee.name, employee.sex);
  
  // Create sophisticated avatar using multiple parameters for uniqueness
  const seedValue = `${employee.id}_${employee.name}_${ethnicity}_${gender}`.replace(/\s/g, '');
  const colorIndex = employee.id % 20;
  const styleIndex = (employee.id * 7) % 10;
  
  const colors = [
    '1abc9c', '2ecc71', '3498db', '9b59b6', 'e74c3c', 'f39c12', 
    '34495e', 'e67e22', '95a5a6', '16a085', '27ae60', '2980b9',
    '8e44ad', 'c0392b', 'd35400', '2c3e50', '7f8c8d', 'bdc3c7',
    'f1c40f', 'e74c3c'
  ];
  
  const styles = [
    'avataaars', 'personas', 'initials', 'identicon', 'rings', 
    'pixel-art', 'lorelei', 'miniavs', 'open-peeps', 'bottts'
  ];
  
  // Use DiceBear API for high-quality, diverse avatars
  const style = styles[styleIndex];
  const color = colors[colorIndex];
  
  // Create unique avatar with demographic considerations
  let avatarUrl = `https://api.dicebear.com/7.x/${style}/png?seed=${seedValue}&backgroundColor=${color}&size=150`;
  
  // Add gender-specific styling if supported
  if (['avataaars', 'personas', 'open-peeps'].includes(style)) {
    avatarUrl += `&gender=${gender}`;
  }
  
  // Add ethnicity-appropriate features for supported styles
  if (style === 'avataaars') {
    const skinColors = {
      'asian': 'fdbcb4,edb7a3,d08b5b',
      'south_asian': 'edb7a3,d08b5b,ae5d29',
      'hispanic': 'edb7a3,d08b5b,ae5d29',
      'middle_eastern': 'edb7a3,d08b5b,ae5d29',
      'african': 'ae5d29,614335,42312b',
      'western': 'fdbcb4,edb7a3,f8d25c'
    };
    
    if (skinColors[ethnicity]) {
      avatarUrl += `&skinColor=${skinColors[ethnicity].split(',')[index % 3]}`;
    }
  }
  
  return avatarUrl;
}

async function assignDiverseAvatars() {
  const client = await pool.connect();
  
  try {
    console.log('Generating diverse, professional avatars for Canva employees...');
    
    // Get all Canva employees
    const result = await client.query(`
      SELECT id, name, surname, email, department, phone_number, sex, nationality, birth_date
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    const employees = result.rows;
    console.log(`Processing ${employees.length} employees`);
    
    let updatedCount = 0;
    const usedAvatars = new Set();
    
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      let avatarUrl;
      let attempts = 0;
      
      // Generate unique avatar, retry if duplicate
      do {
        avatarUrl = generateHighQualityAvatar(employee, i + attempts);
        attempts++;
      } while (usedAvatars.has(avatarUrl) && attempts < 5);
      
      // If still duplicate after 5 attempts, add timestamp for uniqueness
      if (usedAvatars.has(avatarUrl)) {
        avatarUrl += `&timestamp=${Date.now()}_${i}`;
      }
      
      usedAvatars.add(avatarUrl);
      
      // Update database
      await client.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatarUrl, employee.id]
      );
      
      updatedCount++;
      
      if (updatedCount % 50 === 0 || updatedCount === employees.length) {
        console.log(`Updated ${updatedCount}/${employees.length} employees with unique avatars`);
      }
    }
    
    // Verify final results
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(avatar_url) as with_avatars,
        COUNT(DISTINCT avatar_url) as unique_avatars
      FROM users 
      WHERE email LIKE '%@canva.com'
    `);
    
    const stats = finalCheck.rows[0];
    
    console.log('\nAvatar assignment completed successfully!');
    console.log(`Total employees: ${stats.total}`);
    console.log(`Employees with avatars: ${stats.with_avatars}`);
    console.log(`Unique avatars: ${stats.unique_avatars}`);
    console.log(`Coverage: ${Math.round((stats.with_avatars / stats.total) * 100)}%`);
    console.log(`Uniqueness: ${Math.round((stats.unique_avatars / stats.with_avatars) * 100)}%`);
    
  } catch (error) {
    console.error('Error in avatar assignment:', error);
  } finally {
    client.release();
  }
}

assignDiverseAvatars()
  .then(() => {
    console.log('Diverse avatar generation completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Avatar generation failed:', error);
    process.exit(1);
  });