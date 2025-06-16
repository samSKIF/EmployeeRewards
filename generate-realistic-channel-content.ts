/**
 * Generate realistic channel content with real employee data
 * Creates authentic posts, engagement, and channel memberships
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { 
  users, 
  interestChannels, 
  interestChannelPosts, 
  interestChannelMembers,
  interestChannelPostLikes,
  interestChannelPostComments,
  interestChannelPinnedPosts
} from './shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// Realistic post content templates by channel type
const postTemplates = {
  'department': {
    'Marketing': [
      "Excited to share our Q4 campaign results! 📈 We exceeded our engagement targets by 23%. Great work team!",
      "New brand guidelines are now live. Check them out in the shared drive and let me know your thoughts.",
      "Coffee chat session this Friday at 3 PM to discuss upcoming product launches. Who's in?",
      "Just finished the customer feedback analysis - some really valuable insights for our next campaign.",
      "Shoutout to everyone who helped with the trade show last week. The booth was a huge success!",
      "Monthly marketing metrics review scheduled for next Tuesday. Please have your reports ready.",
      "Love seeing all the creative ideas coming through. Our brainstorming sessions are really paying off!",
      "Reminder: Budget planning meeting tomorrow at 10 AM. Don't forget to bring your proposals."
    ],
    'Engineering': [
      "Successfully deployed the new API endpoints to production. Everything is running smoothly! 🚀",
      "Code review session scheduled for this afternoon. Looking forward to the collaboration.",
      "Found an interesting optimization that reduced our query time by 40%. Happy to share the details.",
      "Working on the new authentication system. Should have a demo ready by end of week.",
      "Great debugging session today! Thanks everyone for the fresh perspectives on that tricky bug.",
      "Docker containers are now fully configured for the staging environment. Ready for testing!",
      "Loving the new development tools we adopted. Productivity has definitely improved.",
      "Anyone interested in a tech talk about microservices architecture next Friday?"
    ],
    'HR': [
      "Welcome to our 5 new team members joining us this month! So excited to have you all aboard.",
      "Open enrollment for benefits starts next week. Check your email for detailed information.",
      "Employee appreciation lunch this Friday! Menu and details coming soon.",
      "Reminder: Annual performance reviews are due by month end. Please schedule your meetings.",
      "New wellness program launching next quarter. Early signup gets you a fitness tracker!",
      "Great turnout at yesterday's diversity and inclusion workshop. Thank you for your engagement.",
      "Updated employee handbook is now available. Key changes highlighted in the summary document.",
      "Mental health resources and support contacts have been updated on the intranet."
    ],
    'Sales': [
      "Amazing quarter everyone! We hit 112% of our target. Celebration drinks on me! 🎉",
      "New lead qualification process is working great. Conversion rates are up 18%.",
      "Customer success stories from this month are truly inspiring. Love what we do!",
      "Pipeline review meeting tomorrow at 2 PM. Come prepared with your top 3 opportunities.",
      "Fantastic feedback from the client presentation yesterday. Deal is looking very promising!",
      "Sales training workshop next week covers advanced negotiation techniques. Don't miss it!",
      "Referral program update: We've already generated 15 new leads this month through referrals.",
      "Territory mapping session scheduled for Friday. Let's optimize our coverage strategy."
    ]
  },
  'site': [
    "New parking guidelines go into effect Monday. Please review the updated map.",
    "Office renovation is ahead of schedule! Can't wait to see the new collaborative spaces.",
    "Fire drill scheduled for this Thursday at 2 PM. Please familiarize yourself with exit routes.",
    "Local restaurant partnerships announced! Great lunch discounts for our team members.",
    "Holiday party planning committee meeting next Tuesday. We need your creative input!",
    "Building maintenance window this weekend. Some areas may have limited access.",
    "New security badges will be distributed starting next week. Old ones expire end of month.",
    "Office supply orders are being placed Friday. Submit your requests by Thursday noon."
  ],
  'interest': [
    "Found this amazing hiking trail last weekend! Perfect difficulty level for a group outing.",
    "Book club discussion was fantastic! Next month we're reading 'Atomic Habits'. Who's in?",
    "Photography walk this Saturday morning around downtown. Bring your cameras!",
    "Chess tournament bracket is up! First round matches need to be completed by Friday.",
    "Cooking class was a huge success! Thanks to everyone who shared their recipes.",
    "Gaming night this Friday - both board games and video games. Pizza will be provided!",
    "Art supply swap happening next week. Bring supplies you don't use, take what you need.",
    "Yoga sessions are now twice weekly! Monday and Wednesday at 6 PM in the wellness room."
  ],
  'project': [
    "Sprint review went really well! We're on track to deliver by the target date.",
    "Stakeholder feedback has been incorporated into the latest designs. Looking much better!",
    "Testing phase begins next week. Please review the test scenarios document.",
    "Great collaboration between teams on this project. The synergy is really showing!",
    "Milestone 3 completed ahead of schedule! Team celebration this Friday afternoon.",
    "Resource allocation meeting tomorrow to plan the final phase. See you there!",
    "Client demo scheduled for next Thursday. Let's make sure everything is polished.",
    "Risk assessment update: All major concerns have been addressed and mitigated."
  ],
  'social': [
    "Team lunch at the new Mediterranean place was amazing! Highly recommend the lamb.",
    "Friday happy hour at the rooftop bar! Join us for drinks and great city views.",
    "Office olympics planning is underway! Which events should we include this year?",
    "Movie night this Saturday - we're watching the latest Marvel film. Popcorn included!",
    "Trivia night team needs one more member! We're called 'The Know-It-Alls' 😄",
    "BBQ potluck this weekend! I'm bringing my famous potato salad. What are you bringing?",
    "Escape room adventure was so much fun! We actually made it out with 3 minutes to spare.",
    "Karaoke night was epic! Who knew we had so many hidden talents in the office?"
  ]
};

// Cover images for different channel types
const coverImages = {
  'department': [
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=300&fit=crop'
  ],
  'site': [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=300&fit=crop'
  ],
  'interest': [
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=800&h=300&fit=crop'
  ],
  'project': [
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=300&fit=crop'
  ],
  'social': [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=300&fit=crop',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=300&fit=crop'
  ]
};

async function generateRealisticChannelContent() {
  console.log('Starting realistic channel content generation...');

  try {
    // Get all active channels
    const channels = await db.select()
      .from(interestChannels)
      .where(eq(interestChannels.isActive, true));

    console.log(`Found ${channels.length} active channels`);

    // Get active users for realistic engagement
    const activeUsers = await db.select({
      id: users.id,
      name: users.name,
      department: users.department,
      location: users.location,
      avatarUrl: users.avatarUrl
    })
    .from(users)
    .where(eq(users.status, 'active'))
    .limit(200);

    console.log(`Found ${activeUsers.length} active users`);

    // Update channels with cover images
    console.log('Adding cover images to channels...');
    for (const channel of channels) {
      const channelTypeImages = coverImages[channel.channelType as keyof typeof coverImages] || coverImages['interest'];
      const coverImageUrl = channelTypeImages[Math.floor(Math.random() * channelTypeImages.length)];
      
      // Note: This would require adding coverImageUrl field to schema
      // For now, we'll skip this part and focus on posts and engagement
    }

    // Generate realistic channel memberships
    console.log('Creating realistic channel memberships...');
    for (const channel of channels) {
      let relevantUsers = activeUsers;

      // Filter users based on channel access rules
      if (channel.accessLevel === 'department_only' && channel.allowedDepartments?.length > 0) {
        relevantUsers = activeUsers.filter(user => 
          channel.allowedDepartments!.includes(user.department!)
        );
      }
      
      if (channel.accessLevel === 'site_only' && channel.allowedSites?.length > 0) {
        relevantUsers = activeUsers.filter(user => 
          channel.allowedSites!.includes(user.location!)
        );
      }

      // Random subset of relevant users (20-80% join rate)
      const joinRate = 0.2 + Math.random() * 0.6;
      const memberCount = Math.max(1, Math.floor(relevantUsers.length * joinRate));
      const shuffledUsers = relevantUsers.sort(() => 0.5 - Math.random());
      const channelMembers = shuffledUsers.slice(0, memberCount);

      // Add members to channel
      for (const user of channelMembers) {
        await db.insert(interestChannelMembers)
          .values({
            channelId: channel.id,
            userId: user.id,
            role: 'member'
          })
          .onConflictDoNothing();
      }

      // Update member count
      await db.update(interestChannels)
        .set({ 
          memberCount: channelMembers.length,
          updatedAt: new Date()
        })
        .where(eq(interestChannels.id, channel.id));

      console.log(`Channel "${channel.name}" now has ${channelMembers.length} members`);
    }

    // Generate realistic posts for each channel
    console.log('Creating realistic posts...');
    const postsPerChannel = 8; // Generate 8 posts per channel

    for (const channel of channels) {
      // Get channel members for post authors
      const channelMembers = await db.select({
        userId: interestChannelMembers.userId,
        userName: users.name,
        userAvatarUrl: users.avatarUrl,
        userDepartment: users.department
      })
      .from(interestChannelMembers)
      .innerJoin(users, eq(interestChannelMembers.userId, users.id))
      .where(eq(interestChannelMembers.channelId, channel.id));

      if (channelMembers.length === 0) continue;

      // Select appropriate post templates
      let templates = postTemplates['interest']; // Default
      
      if (channel.channelType === 'department' && channel.allowedDepartments?.length > 0) {
        const dept = channel.allowedDepartments[0];
        templates = postTemplates['department'][dept as keyof typeof postTemplates['department']] || postTemplates['interest'];
      } else if (postTemplates[channel.channelType as keyof typeof postTemplates]) {
        templates = postTemplates[channel.channelType as keyof typeof postTemplates] as string[];
      }

      // Create posts with realistic timing (last 30 days)
      for (let i = 0; i < postsPerChannel; i++) {
        const author = channelMembers[Math.floor(Math.random() * channelMembers.length)];
        const content = templates[Math.floor(Math.random() * templates.length)];
        
        // Random timestamp in last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const hoursAgo = Math.floor(Math.random() * 24);
        const postDate = new Date();
        postDate.setDate(postDate.getDate() - daysAgo);
        postDate.setHours(postDate.getHours() - hoursAgo);

        // 20% chance of having an image
        const hasImage = Math.random() < 0.2;
        const imageUrl = hasImage ? `https://picsum.photos/600/400?random=${Date.now()}-${i}` : null;

        const post = await db.insert(interestChannelPosts)
          .values({
            channelId: channel.id,
            authorId: author.userId,
            content,
            imageUrl,
            createdAt: postDate,
            updatedAt: postDate
          })
          .returning();

        // Generate realistic engagement (likes and comments)
        const postId = post[0].id;
        const engagementRate = 0.1 + Math.random() * 0.4; // 10-50% engagement
        const engagedCount = Math.floor(channelMembers.length * engagementRate);
        const engagedMembers = channelMembers.sort(() => 0.5 - Math.random()).slice(0, engagedCount);

        let likeCount = 0;
        let commentCount = 0;

        // Add likes (80% of engaged users like)
        for (const member of engagedMembers) {
          if (Math.random() < 0.8) {
            await db.insert(interestChannelPostLikes)
              .values({
                postId,
                userId: member.userId,
                createdAt: new Date(postDate.getTime() + Math.random() * 86400000) // Random time after post
              })
              .onConflictDoNothing();
            likeCount++;
          }
        }

        // Add comments (30% of engaged users comment)
        const commentTemplates = [
          "Great work!", "Thanks for sharing!", "This is really helpful!",
          "Love this idea!", "Completely agree!", "Awesome job team!",
          "Thanks for the update!", "This looks amazing!", "Well done!",
          "Perfect timing!", "Exactly what we needed!", "Fantastic results!"
        ];

        for (const member of engagedMembers) {
          if (Math.random() < 0.3) {
            const commentContent = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
            await db.insert(interestChannelPostComments)
              .values({
                postId,
                authorId: member.userId,
                content: commentContent,
                createdAt: new Date(postDate.getTime() + Math.random() * 86400000)
              });
            commentCount++;
          }
        }

        // Update post engagement counts
        await db.update(interestChannelPosts)
          .set({
            likeCount,
            commentCount,
            updatedAt: new Date()
          })
          .where(eq(interestChannelPosts.id, postId));
      }

      console.log(`Created ${postsPerChannel} posts for channel "${channel.name}"`);
    }

    // Pin some high-engagement posts for demonstration
    console.log('Pinning high-engagement posts...');
    
    // Get top posts by engagement from each channel type
    const topPosts = await db.select({
      id: interestChannelPosts.id,
      channelId: interestChannelPosts.channelId,
      channelName: interestChannels.name,
      channelType: interestChannels.channelType,
      engagementScore: sql<number>`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount}`,
      createdBy: interestChannels.createdBy
    })
    .from(interestChannelPosts)
    .innerJoin(interestChannels, eq(interestChannelPosts.channelId, interestChannels.id))
    .where(eq(interestChannels.isActive, true))
    .orderBy(sql`${interestChannelPosts.likeCount} + ${interestChannelPosts.commentCount} DESC`)
    .limit(10);

    // Pin top 4 posts with different orders
    for (let i = 0; i < Math.min(4, topPosts.length); i++) {
      const post = topPosts[i];
      await db.insert(interestChannelPinnedPosts)
        .values({
          channelId: post.channelId,
          postId: post.id,
          pinnedBy: post.createdBy || 1680, // Default to admin user
          order: i + 1
        })
        .onConflictDoNothing();
      
      console.log(`Pinned post from "${post.channelName}" with engagement score ${post.engagementScore}`);
    }

    console.log('✅ Realistic channel content generation completed successfully!');
    
    // Print summary
    const totalPosts = await db.select({ count: sql<number>`count(*)` })
      .from(interestChannelPosts);
    
    const totalMembers = await db.select({ count: sql<number>`count(*)` })
      .from(interestChannelMembers);
      
    const totalLikes = await db.select({ count: sql<number>`count(*)` })
      .from(interestChannelPostLikes);
      
    const totalComments = await db.select({ count: sql<number>`count(*)` })
      .from(interestChannelPostComments);

    console.log('\n📊 Content Generation Summary:');
    console.log(`Channels: ${channels.length}`);
    console.log(`Posts: ${totalPosts[0].count}`);
    console.log(`Members: ${totalMembers[0].count}`);
    console.log(`Likes: ${totalLikes[0].count}`);
    console.log(`Comments: ${totalComments[0].count}`);

  } catch (error) {
    console.error('Error generating realistic channel content:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
generateRealisticChannelContent();