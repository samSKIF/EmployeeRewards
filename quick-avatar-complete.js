/**
 * Quick and efficient avatar assignment to complete 100% unique coverage
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function quickAvatarComplete() {
  const client = await pool.connect();
  
  try {
    // Get all 402 Canva users ordered by ID
    const users = await client.query(`
      SELECT id, name, email FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    console.log(`Assigning unique avatars to ${users.rows.length} Canva employees`);
    
    // Create 402+ unique avatars using simple, reliable approach
    const avatars = [];
    
    // Method 1: RandomUser portraits (198 total)
    for (let i = 1; i <= 99; i++) {
      avatars.push(`https://randomuser.me/api/portraits/men/${i}.jpg`);
      avatars.push(`https://randomuser.me/api/portraits/women/${i}.jpg`);
    }
    
    // Method 2: UI Avatars with user ID as seed (guaranteed unique)
    for (let i = 0; i < users.rows.length; i++) {
      if (i >= avatars.length) {
        const user = users.rows[i];
        avatars.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=150&rounded=true&seed=${user.id}`);
      }
    }
    
    console.log(`Generated ${avatars.length} unique avatars`);
    
    // Batch update all users with unique avatars
    const updates = users.rows.map((user, index) => {
      return client.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatars[index], user.id]
      );
    });
    
    await Promise.all(updates);
    
    // Verify completion
    const final = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(avatar_url) as with_avatars,
        COUNT(DISTINCT avatar_url) as unique_avatars
      FROM users WHERE email LIKE '%@canva.com'
    `);
    
    const stats = final.rows[0];
    console.log(`\nCompleted! Total: ${stats.total}, With avatars: ${stats.with_avatars}, Unique: ${stats.unique_avatars}`);
    console.log(`Coverage: ${Math.round((stats.with_avatars / stats.total) * 100)}%`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
  }
}

quickAvatarComplete().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });