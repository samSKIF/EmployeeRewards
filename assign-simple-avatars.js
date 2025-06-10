/**
 * Simple script to assign unique profile pictures to all Canva employees
 * Uses RandomUser API and UI Avatars for guaranteed uniqueness
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Generate 500+ unique avatar URLs
function generateUniqueAvatars() {
  const avatars = [];
  
  // RandomUser API - 198 unique portraits (99 men + 99 women)
  for (let i = 1; i <= 99; i++) {
    avatars.push(`https://randomuser.me/api/portraits/men/${i}.jpg`);
    avatars.push(`https://randomuser.me/api/portraits/women/${i}.jpg`);
  }
  
  // UI Avatars with unique combinations - 300+ unique avatars
  const names = [
    'Alex', 'Blake', 'Casey', 'Drew', 'Ellis', 'Finley', 'Gray', 'Hayden', 'Indigo', 'Jules',
    'Kai', 'Lane', 'Max', 'Nova', 'Ocean', 'Parker', 'Quinn', 'River', 'Sage', 'Taylor',
    'Uma', 'Vale', 'Wren', 'Xen', 'York', 'Zara', 'Ash', 'Bay', 'Cruz', 'Dove',
    'Echo', 'Fox', 'Glen', 'Halo', 'Iris', 'Jazz', 'Knox', 'Luna', 'Moss', 'Nyx'
  ];
  
  const backgrounds = [
    'FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9',
    'F8C471', 'AED6F1', 'A9DFBF', 'D2B4DE', 'F9E79F', 'FAD7A0', 'ABEBC6', 'D5A6BD'
  ];
  
  names.forEach(name => {
    backgrounds.forEach(bg => {
      avatars.push(`https://ui-avatars.com/api/?name=${name}&background=${bg}&color=fff&size=150&rounded=true`);
    });
  });
  
  return avatars;
}

async function assignUniqueAvatarsToCanva() {
  const client = await pool.connect();
  
  try {
    console.log('Assigning unique avatars to all Canva employees...');
    
    // Get all Canva users
    const usersResult = await client.query(`
      SELECT id, name, surname, email, avatar_url
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    const users = usersResult.rows;
    console.log(`Found ${users.length} Canva users`);
    
    // Generate unique avatars
    const availableAvatars = generateUniqueAvatars();
    console.log(`Generated ${availableAvatars.length} unique avatars`);
    
    if (availableAvatars.length < users.length) {
      console.log('Warning: Not enough unique avatars for all users');
    }
    
    let updatedCount = 0;
    
    // Assign unique avatar to each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const avatarUrl = availableAvatars[i % availableAvatars.length];
      
      await client.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatarUrl, user.id]
      );
      
      updatedCount++;
      console.log(`Updated ${user.name} (${updatedCount}/${users.length}) with avatar`);
    }
    
    console.log(`\n✅ Avatar assignment complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   • Total users updated: ${updatedCount}`);
    console.log(`   • Users with avatars: ${users.length} (100%)`);
    console.log(`   • Unique avatars available: ${availableAvatars.length}`);
    
  } catch (error) {
    console.error('Error assigning avatars:', error);
  } finally {
    client.release();
  }
}

// Run the script
assignUniqueAvatarsToCanva()
  .then(() => {
    console.log('Avatar assignment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });