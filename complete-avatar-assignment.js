/**
 * Complete avatar assignment for remaining Canva employees
 * Ensures 100% coverage with unique avatars
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Generate 500+ unique avatar URLs using multiple reliable sources
function generateComprehensiveAvatarPool() {
  const avatars = [];
  
  // RandomUser API - 198 unique portraits
  for (let i = 1; i <= 99; i++) {
    avatars.push(`https://randomuser.me/api/portraits/men/${i}.jpg`);
    avatars.push(`https://randomuser.me/api/portraits/women/${i}.jpg`);
  }
  
  // UI Avatars with unique name/background combinations
  const names = [
    'Alex', 'Blake', 'Casey', 'Drew', 'Ellis', 'Finley', 'Gray', 'Hayden', 'Indigo', 'Jules',
    'Kai', 'Lane', 'Max', 'Nova', 'Ocean', 'Parker', 'Quinn', 'River', 'Sage', 'Taylor',
    'Uma', 'Vale', 'Wren', 'Xen', 'York', 'Zara', 'Ash', 'Bay', 'Cruz', 'Dove',
    'Echo', 'Fox', 'Glen', 'Halo', 'Iris', 'Jazz', 'Knox', 'Luna', 'Moss', 'Nyx',
    'Orion', 'Phoenix', 'Quest', 'Raven', 'Storm', 'Teal', 'Unity', 'Vega', 'Winter', 'Zion'
  ];
  
  const backgrounds = [
    '1abc9c', '2ecc71', '3498db', '9b59b6', 'e74c3c', 'f39c12', 
    '34495e', 'e67e22', '95a5a6', '16a085', '27ae60', '2980b9',
    '8e44ad', 'c0392b', 'd35400', '2c3e50', '7f8c8d', 'bdc3c7'
  ];
  
  names.forEach(name => {
    backgrounds.forEach(bg => {
      avatars.push(`https://ui-avatars.com/api/?name=${name}&background=${bg}&color=ffffff&size=150&rounded=true`);
    });
  });
  
  return avatars;
}

async function completeAvatarAssignment() {
  const client = await pool.connect();
  
  try {
    console.log('Completing avatar assignment for all Canva employees...');
    
    // Get all Canva users without avatars
    const usersResult = await client.query(`
      SELECT id, name, surname, email, avatar_url
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    const users = usersResult.rows;
    console.log(`Found ${users.length} total Canva users`);
    
    // Get currently used avatars to avoid duplicates
    const usedAvatarsResult = await client.query(`
      SELECT DISTINCT avatar_url
      FROM users 
      WHERE email LIKE '%@canva.com' AND avatar_url IS NOT NULL
    `);
    
    const usedAvatars = new Set(usedAvatarsResult.rows.map(row => row.avatar_url));
    console.log(`Found ${usedAvatars.size} avatars already in use`);
    
    // Generate comprehensive avatar pool
    const allAvatars = generateComprehensiveAvatarPool();
    console.log(`Generated ${allAvatars.length} total avatars`);
    
    // Filter out used avatars to get available ones
    const availableAvatars = allAvatars.filter(url => !usedAvatars.has(url));
    console.log(`${availableAvatars.length} unique avatars available for assignment`);
    
    let updatedCount = 0;
    let avatarIndex = 0;
    
    // Process all users and assign unique avatars
    for (const user of users) {
      let needsUpdate = false;
      let newAvatarUrl = user.avatar_url;
      
      if (!user.avatar_url) {
        // User has no avatar
        needsUpdate = true;
      } else {
        // Check if user has a duplicate avatar
        const duplicateCount = await client.query(
          'SELECT COUNT(*) as count FROM users WHERE email LIKE \'%@canva.com\' AND avatar_url = $1',
          [user.avatar_url]
        );
        
        if (parseInt(duplicateCount.rows[0].count) > 1) {
          // User has duplicate avatar, needs new one
          needsUpdate = true;
          usedAvatars.delete(user.avatar_url); // Remove from used set so others can use it
        }
      }
      
      if (needsUpdate) {
        // Assign next available unique avatar
        if (avatarIndex < availableAvatars.length) {
          newAvatarUrl = availableAvatars[avatarIndex];
          avatarIndex++;
        } else {
          // Fallback: create unique avatar with user ID
          newAvatarUrl = `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff&size=150&rounded=true&seed=${user.id}`;
        }
        
        await client.query(
          'UPDATE users SET avatar_url = $1 WHERE id = $2',
          [newAvatarUrl, user.id]
        );
        
        usedAvatars.add(newAvatarUrl);
        updatedCount++;
        console.log(`Updated ${user.name} (${updatedCount} updates) with unique avatar`);
      }
    }
    
    // Final verification
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_canva_users,
        COUNT(avatar_url) as users_with_avatars,
        COUNT(DISTINCT avatar_url) as unique_avatars
      FROM users 
      WHERE email LIKE '%@canva.com'
    `);
    
    const stats = finalStats.rows[0];
    
    console.log(`\n✅ Avatar assignment complete!`);
    console.log(`📊 Final Statistics:`);
    console.log(`   • Total Canva employees: ${stats.total_canva_users}`);
    console.log(`   • Employees with avatars: ${stats.users_with_avatars}`);
    console.log(`   • Unique avatars used: ${stats.unique_avatars}`);
    console.log(`   • Coverage: ${Math.round((stats.users_with_avatars / stats.total_canva_users) * 100)}%`);
    console.log(`   • Updates made: ${updatedCount}`);
    
  } catch (error) {
    console.error('Error completing avatar assignment:', error);
  } finally {
    client.release();
  }
}

// Run the script
completeAvatarAssignment()
  .then(() => {
    console.log('Avatar assignment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });