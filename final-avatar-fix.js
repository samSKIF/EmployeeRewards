/**
 * Final avatar assignment - ensure all 402 Canva employees have unique avatars
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function finalAvatarFix() {
  const client = await pool.connect();
  
  try {
    console.log('Final avatar assignment starting...');
    
    // Get all Canva users and their current avatar status
    const allUsers = await client.query(`
      SELECT id, name, email, avatar_url
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    console.log(`Processing ${allUsers.rows.length} Canva employees`);
    
    // Generate a large pool of unique avatars using multiple sources
    const avatarPool = [];
    
    // RandomUser portraits (198 unique)
    for (let i = 1; i <= 99; i++) {
      avatarPool.push(`https://randomuser.me/api/portraits/men/${i}.jpg`);
      avatarPool.push(`https://randomuser.me/api/portraits/women/${i}.jpg`);
    }
    
    // UI Avatars with systematic generation (600+ unique combinations)
    const initials = ['AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP',
                     'BA', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP',
                     'CA', 'CB', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP',
                     'DA', 'DB', 'DC', 'DE', 'DF', 'DG', 'DH', 'DI', 'DJ', 'DK', 'DL', 'DM', 'DN', 'DO', 'DP'];
    
    const colors = ['1abc9c', '2ecc71', '3498db', '9b59b6', 'e74c3c', 'f39c12', '34495e', 'e67e22', 
                   '95a5a6', '16a085', '27ae60', '2980b9', '8e44ad', 'c0392b', 'd35400', '2c3e50'];
    
    initials.forEach(initial => {
      colors.forEach(color => {
        avatarPool.push(`https://ui-avatars.com/api/?name=${initial}&background=${color}&color=ffffff&size=150&rounded=true`);
      });
    });
    
    console.log(`Generated ${avatarPool.length} unique avatars`);
    
    // Assign unique avatar to each user
    let updateCount = 0;
    
    for (let i = 0; i < allUsers.rows.length; i++) {
      const user = allUsers.rows[i];
      const uniqueAvatar = avatarPool[i];
      
      if (uniqueAvatar) {
        await client.query(
          'UPDATE users SET avatar_url = $1 WHERE id = $2',
          [uniqueAvatar, user.id]
        );
        updateCount++;
        
        if (updateCount % 50 === 0) {
          console.log(`Updated ${updateCount}/${allUsers.rows.length} users`);
        }
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
    
    console.log('\n✅ Avatar assignment completed!');
    console.log(`Total Canva employees: ${stats.total}`);
    console.log(`Employees with avatars: ${stats.with_avatars}`);
    console.log(`Unique avatars: ${stats.unique_avatars}`);
    console.log(`Coverage: ${Math.round((stats.with_avatars / stats.total) * 100)}%`);
    console.log(`Updates made: ${updateCount}`);
    
  } catch (error) {
    console.error('Error in final avatar assignment:', error);
  } finally {
    client.release();
  }
}

finalAvatarFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });