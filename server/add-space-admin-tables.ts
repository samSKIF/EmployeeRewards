import { pool } from "./db";

/**
 * This script adds the new Channel Admin tables for join requests and pinned posts
 */
async function addChannelAdminTables() {
  console.log("Adding Channel Admin tables...");
  
  try {
    // Create interest_channel_join_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interest_channel_join_requests (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER NOT NULL REFERENCES interest_channels(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' NOT NULL,
        request_message TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        review_message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(channel_id, user_id)
      )
    `);
    console.log("Created interest_channel_join_requests table");

    // Create interest_channel_pinned_posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interest_channel_pinned_posts (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER NOT NULL REFERENCES interest_channels(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES interest_channel_posts(id) ON DELETE CASCADE,
        pinned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pinned_at TIMESTAMP DEFAULT NOW() NOT NULL,
        "order" INTEGER DEFAULT 0,
        UNIQUE(channel_id, post_id)
      )
    `);
    console.log("Created interest_channel_pinned_posts table");

    // Add admin field to existing channels by promoting one member to admin for each channel
    console.log("Promoting existing channel members to admins...");
    
    // Get all channels that have members
    const channelsWithMembers = await pool.query(`
      SELECT DISTINCT c.id as channel_id, c.created_by, 
             (SELECT user_id FROM interest_channel_members 
              WHERE channel_id = c.id 
              ORDER BY joined_at ASC 
              LIMIT 1) as first_member
      FROM interest_channels c
      INNER JOIN interest_channel_members m ON c.id = m.channel_id
    `);

    // Promote the first member (or creator if they're a member) to admin for each channel
    for (const channel of channelsWithMembers.rows) {
      const adminUserId = channel.first_member || channel.created_by;
      
      await pool.query(`
        UPDATE interest_channel_members 
        SET role = 'admin' 
        WHERE channel_id = $1 AND user_id = $2
      `, [channel.channel_id, adminUserId]);
      
      console.log(`Promoted user ${adminUserId} to admin for channel ${channel.channel_id}`);
    }

    console.log("Channel Admin tables added successfully!");
  } catch (error) {
    console.error("Error adding Channel Admin tables:", error);
  } finally {
    await pool.end();
  }
}

addChannelAdminTables();