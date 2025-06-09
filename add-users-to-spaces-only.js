/**
 * Script to add real Canva users to channels
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addUsersToChannels() {
  const client = await pool.connect();
  
  try {
    console.log('Adding Canva users to channels...');
    
    // Get all Canva users
    const usersResult = await client.query(`
      SELECT id, name, email, department, location
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    const users = usersResult.rows;
    console.log(`Found ${users.length} Canva users`);
    
    // Get all channels
    const channelsResult = await client.query(`
      SELECT id, name, channel_type, allowed_departments, allowed_sites
      FROM interest_channels 
      ORDER BY id
    `);
    
    const channels = channelsResult.rows;
    console.log(`Found ${channels.length} channels`);
    
    for (const channel of channels) {
      console.log(`\nProcessing channel: ${channel.name}`);
      
      let eligibleUsers = users;
      
      // Filter by department if specified
      if (channel.allowed_departments && channel.allowed_departments.length > 0) {
        eligibleUsers = users.filter(user => 
          channel.allowed_departments.includes(user.department)
        );
        console.log(`Filtered to ${eligibleUsers.length} users by department`);
      }
      
      // Filter by location if specified
      if (channel.allowed_sites && channel.allowed_sites.length > 0) {
        eligibleUsers = users.filter(user => 
          channel.allowed_sites.includes(user.location)
        );
        console.log(`Filtered to ${eligibleUsers.length} users by location`);
      }
      
      // Add 40-80% of eligible users to each channel
      const membershipRate = Math.random() * 0.4 + 0.4; // 40-80%
      const usersToAdd = eligibleUsers
        .sort(() => Math.random() - 0.5) // shuffle
        .slice(0, Math.floor(eligibleUsers.length * membershipRate));
      
      console.log(`Adding ${usersToAdd.length} users to channel ${channel.name}`);
      
      // Add users to channel in batches
      for (let i = 0; i < usersToAdd.length; i += 10) {
        const batch = usersToAdd.slice(i, i + 10);
        
        for (const user of batch) {
          try {
            await client.query(`
              INSERT INTO interest_channel_members (channel_id, user_id, joined_at, role)
              VALUES ($1, $2, NOW(), 'member')
              ON CONFLICT (channel_id, user_id) DO NOTHING
            `, [channel.id, user.id]);
          } catch (error) {
            // User already in channel, skip
          }
        }
        
        console.log(`Added batch ${Math.floor(i/10) + 1}/${Math.ceil(usersToAdd.length/10)}`);
      }
      
      // Update channel member count
      await client.query(`
        UPDATE interest_channels 
        SET member_count = (
          SELECT COUNT(*) 
          FROM interest_channel_members 
          WHERE channel_id = $1
        )
        WHERE id = $1
      `, [channel.id]);
      
      console.log(`Updated member count for ${channel.name}`);
    }
    
    console.log('\n✅ Successfully added users to all channels');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

addUsersToChannels()
  .then(() => process.exit(0))
  .catch(console.error);