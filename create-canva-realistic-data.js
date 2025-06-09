import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createCanvaRealisticData() {
  console.log('Creating realistic Canva employee data...');

  try {
    // Real Canva employee data with authentic departments and roles
    const canvaEmployees = [
      // Design Team
      { name: 'Sarah Chen', username: 'sarah.chen', email: 'sarah.chen@canva.com', department: 'Design', jobTitle: 'Senior Product Designer', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b55c?w=150&h=150&fit=crop&crop=face' },
      { name: 'Marcus Rodriguez', username: 'marcus.rodriguez', email: 'marcus.rodriguez@canva.com', department: 'Design', jobTitle: 'UX Research Lead', location: 'San Francisco', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
      { name: 'Emma Thompson', username: 'emma.thompson', email: 'emma.thompson@canva.com', department: 'Design', jobTitle: 'Visual Designer', location: 'Melbourne', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
      { name: 'David Kim', username: 'david.kim', email: 'david.kim@canva.com', department: 'Design', jobTitle: 'Design Systems Lead', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
      
      // Engineering Team
      { name: 'Alex Petrov', username: 'alex.petrov', email: 'alex.petrov@canva.com', department: 'Engineering', jobTitle: 'Senior Frontend Engineer', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
      { name: 'Priya Sharma', username: 'priya.sharma', email: 'priya.sharma@canva.com', department: 'Engineering', jobTitle: 'Backend Engineer', location: 'Manila', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face' },
      { name: 'James Wilson', username: 'james.wilson', email: 'james.wilson@canva.com', department: 'Engineering', jobTitle: 'DevOps Engineer', location: 'Austin', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face' },
      { name: 'Lisa Zhang', username: 'lisa.zhang', email: 'lisa.zhang@canva.com', department: 'Engineering', jobTitle: 'Full Stack Engineer', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face' },
      
      // Product Team
      { name: 'Michael Foster', username: 'michael.foster', email: 'michael.foster@canva.com', department: 'Product', jobTitle: 'Senior Product Manager', location: 'San Francisco', avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face' },
      { name: 'Rachel Green', username: 'rachel.green', email: 'rachel.green@canva.com', department: 'Product', jobTitle: 'Product Marketing Manager', location: 'Melbourne', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face' },
      { name: 'Tom Anderson', username: 'tom.anderson', email: 'tom.anderson@canva.com', department: 'Product', jobTitle: 'Growth Product Manager', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face' },
      
      // Marketing Team
      { name: 'Jessica Martinez', username: 'jessica.martinez', email: 'jessica.martinez@canva.com', department: 'Marketing', jobTitle: 'Brand Marketing Manager', location: 'Austin', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face' },
      { name: 'Kevin Lee', username: 'kevin.lee', email: 'kevin.lee@canva.com', department: 'Marketing', jobTitle: 'Content Marketing Lead', location: 'San Francisco', avatar: 'https://images.unsplash.com/photo-1522075469751-3847ae2e4c73?w=150&h=150&fit=crop&crop=face' },
      { name: 'Olivia Brown', username: 'olivia.brown', email: 'olivia.brown@canva.com', department: 'Marketing', jobTitle: 'Social Media Manager', location: 'Melbourne', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face' },
      
      // Data & Analytics
      { name: 'Robert Taylor', username: 'robert.taylor', email: 'robert.taylor@canva.com', department: 'Data & Analytics', jobTitle: 'Senior Data Scientist', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face' },
      { name: 'Sophia Davis', username: 'sophia.davis', email: 'sophia.davis@canva.com', department: 'Data & Analytics', jobTitle: 'Analytics Engineer', location: 'Manila', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face' },
      
      // People & Culture
      { name: 'Amanda Clark', username: 'amanda.clark', email: 'amanda.clark@canva.com', department: 'People & Culture', jobTitle: 'People Operations Manager', location: 'Sydney', avatar: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=150&h=150&fit=crop&crop=face' },
      { name: 'Daniel Wright', username: 'daniel.wright', email: 'daniel.wright@canva.com', department: 'People & Culture', jobTitle: 'Talent Acquisition Lead', location: 'Austin', avatar: 'https://images.unsplash.com/photo-1507919909716-c8262e491cde?w=150&h=150&fit=crop&crop=face' },
      
      // Sales & Customer Success
      { name: 'Jennifer Lopez', username: 'jennifer.lopez', email: 'jennifer.lopez@canva.com', department: 'Sales', jobTitle: 'Enterprise Sales Manager', location: 'San Francisco', avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=150&h=150&fit=crop&crop=face' },
      { name: 'Ryan Mitchell', username: 'ryan.mitchell', email: 'ryan.mitchell@canva.com', department: 'Customer Success', jobTitle: 'Customer Success Manager', location: 'Melbourne', avatar: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&h=150&fit=crop&crop=face' }
    ];

    // Clear existing data safely
    await pool.query(`DELETE FROM interest_channel_posts WHERE channel_id IN (SELECT id FROM interest_channels WHERE organization_id = 1)`);
    await pool.query(`DELETE FROM interest_channel_members WHERE channel_id IN (SELECT id FROM interest_channels WHERE organization_id = 1)`);
    await pool.query(`DELETE FROM interest_channels WHERE organization_id = 1`);
    await pool.query(`DELETE FROM users WHERE email LIKE '%@canva.com' AND email NOT LIKE '%admin%'`);
    
    console.log('Creating Canva employee accounts...');
    const hashedPassword = await bcrypt.hash('canva2024', 10);
    
    const userIds = [];
    for (const employee of canvaEmployees) {
      const result = await pool.query(`
        INSERT INTO users (username, name, email, password, department, job_title, phone_number, 
                          nationality, sex, birth_date, status, is_admin, avatar_url, organization_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        employee.username,
        employee.name,
        employee.email,
        hashedPassword,
        employee.department,
        employee.jobTitle,
        `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        'Australian',
        Math.random() > 0.5 ? 'male' : 'female',
        new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        'active',
        false,
        employee.avatar,
        1 // Canva organization
      ]);
      userIds.push({ id: result.rows[0].id, ...employee });
    }

    console.log('Creating realistic channels...');
    
    // Create meaningful channels for Canva
    const channels = [
      {
        name: 'Design System Updates',
        description: 'Latest updates and discussions about our design system, components, and guidelines',
        type: 'department',
        department: 'Design',
        coverPhoto: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=400&fit=crop'
      },
      {
        name: 'Product Launches & Roadmap',
        description: 'Announcements about new product features and roadmap discussions',
        type: 'company-wide',
        department: null,
        coverPhoto: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop'
      },
      {
        name: 'Engineering Best Practices',
        description: 'Technical discussions, code reviews, and engineering best practices',
        type: 'department',
        department: 'Engineering',
        coverPhoto: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop'
      },
      {
        name: 'Marketing Campaign Insights',
        description: 'Share campaign results, creative ideas, and marketing strategies',
        type: 'department',
        department: 'Marketing',
        coverPhoto: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
      },
      {
        name: 'Data Insights & Analytics',
        description: 'Share data insights, analytics reports, and research findings',
        type: 'department',
        department: 'Data & Analytics',
        coverPhoto: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
      },
      {
        name: 'Canva Coffee Chat',
        description: 'Casual conversations, team bonding, and non-work discussions',
        type: 'social',
        department: null,
        coverPhoto: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=400&fit=crop'
      },
      {
        name: 'People & Culture Updates',
        description: 'HR announcements, culture initiatives, and employee recognition',
        type: 'department',
        department: 'People & Culture',
        coverPhoto: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop'
      }
    ];

    const channelIds = [];
    for (const channel of channels) {
      const result = await pool.query(`
        INSERT INTO interest_channels (name, description, channel_type, is_active, organization_id, 
                                     allowed_departments, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        channel.name,
        channel.description,
        channel.type,
        true,
        1,
        channel.department ? [channel.department] : null,
        userIds[0].id // Created by first employee
      ]);
      channelIds.push({ id: result.rows[0].id, ...channel });
    }

    console.log('Adding channel members...');
    
    // Add relevant employees to each channel
    for (const channel of channelIds) {
      let relevantUsers = [];
      
      if (channel.department) {
        relevantUsers = userIds.filter(user => user.department === channel.department);
      } else {
        // Company-wide and social channels get all users
        relevantUsers = userIds;
      }

      for (const user of relevantUsers) {
        await pool.query(`
          INSERT INTO interest_channel_members (channel_id, user_id, role, joined_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (channel_id, user_id) DO NOTHING
        `, [channel.id, user.id, 'member']);
      }
    }

    console.log('Creating realistic channel posts...');
    
    // Create meaningful posts for each channel
    const posts = [
      // Design System Updates
      {
        channelName: 'Design System Updates',
        authorEmail: 'sarah.chen@canva.com',
        content: 'Excited to share our new component library update! We\'ve added 15 new components including improved form elements and data visualization charts. The new design tokens are now live in Figma. Check out the updated documentation and let me know your thoughts!',
        imageUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=300&fit=crop'
      },
      {
        channelName: 'Design System Updates',
        authorEmail: 'david.kim@canva.com',
        content: 'Design Systems team weekly update: We\'re working on improving accessibility across all components. New focus states and ARIA labels are being implemented. Thanks to everyone who provided feedback on the color contrast improvements.',
        imageUrl: null
      },
      
      // Product Launches & Roadmap
      {
        channelName: 'Product Launches & Roadmap',
        authorEmail: 'michael.foster@canva.com',
        content: 'Thrilled to announce that our AI-powered background remover feature is now live for all Canva Pro users! This has been months in the making and the results are incredible. Usage is already 3x higher than projected.',
        imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=300&fit=crop'
      },
      {
        channelName: 'Product Launches & Roadmap',
        authorEmail: 'rachel.green@canva.com',
        content: 'Q2 product roadmap is finalized! Major highlights include: Enhanced video editing tools, Real-time collaboration improvements, Mobile app performance optimizations, and new template categories. Full details in the roadmap doc.',
        imageUrl: null
      },
      
      // Engineering Best Practices
      {
        channelName: 'Engineering Best Practices',
        authorEmail: 'alex.petrov@canva.com',
        content: 'Great discussion in today\'s architecture review! Our new microservices setup is showing 40% improvement in response times. The event-driven architecture is working beautifully. Shoutout to the platform team for the amazing work on service mesh.',
        imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=300&fit=crop'
      },
      {
        channelName: 'Engineering Best Practices',
        authorEmail: 'priya.sharma@canva.com',
        content: 'Implemented the new caching layer we discussed last week. Database query times reduced by 65%! The Redis cluster is handling 10M+ operations per minute smoothly. Performance monitoring dashboard looks fantastic.',
        imageUrl: null
      },
      
      // Marketing Campaign Insights
      {
        channelName: 'Marketing Campaign Insights',
        authorEmail: 'jessica.martinez@canva.com',
        content: 'Our latest brand campaign exceeded all expectations! 25M impressions, 2.3% CTR, and 150K new signups. The creative featuring real user stories really resonated with our audience. Video content performed 300% better than static ads.',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop'
      },
      {
        channelName: 'Marketing Campaign Insights',
        authorEmail: 'olivia.brown@canva.com',
        content: 'Social media update: Our TikTok presence is exploding! 500K followers gained this month. The design tip videos are going viral. Instagram engagement is up 180%. The community is creating amazing content with our templates.',
        imageUrl: null
      },
      
      // Data Insights & Analytics
      {
        channelName: 'Data Insights & Analytics',
        authorEmail: 'robert.taylor@canva.com',
        content: 'Fascinating insights from our user behavior analysis: Users who engage with templates in their first week have 85% higher retention. Mobile users prefer simpler editing tools, while desktop users use advanced features 60% more. Full report attached.',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop'
      },
      {
        channelName: 'Data Insights & Analytics',
        authorEmail: 'sophia.davis@canva.com',
        content: 'Machine learning model update: Our recommendation engine accuracy improved to 94%! Users are discovering 40% more relevant templates. The collaborative filtering approach is working exceptionally well.',
        imageUrl: null
      },
      
      // Canva Coffee Chat
      {
        channelName: 'Canva Coffee Chat',
        authorEmail: 'emma.thompson@canva.com',
        content: 'Amazing team lunch at that new Vietnamese place! The pho was incredible and we had great conversations about design trends. Nothing beats good food and even better company. Who\'s up for the dessert place next week?',
        imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&h=300&fit=crop'
      },
      {
        channelName: 'Canva Coffee Chat',
        authorEmail: 'kevin.lee@canva.com',
        content: 'Trivia night was epic! Team "Design Thinking" crushed it with 18/20 correct answers. The question about Canva\'s founding year was perfectly timed. Looking forward to the next social event!',
        imageUrl: null
      },
      
      // People & Culture Updates
      {
        channelName: 'People & Culture Updates',
        authorEmail: 'amanda.clark@canva.com',
        content: 'Excited to welcome 12 new team members this month! Our onboarding program is getting amazing feedback. The mentorship matching system is working beautifully. Welcome to the Canva family everyone!',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=300&fit=crop'
      }
    ];

    // Insert posts with proper author mapping
    for (const post of posts) {
      const channel = channelIds.find(c => c.name === post.channelName);
      const author = userIds.find(u => u.email === post.authorEmail);
      
      if (channel && author) {
        await pool.query(`
          INSERT INTO interest_channel_posts (channel_id, author_id, content, image_url, like_count, comment_count, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days')
        `, [
          channel.id,
          author.id,
          post.content,
          post.imageUrl,
          Math.floor(Math.random() * 25) + 5, // 5-30 likes
          Math.floor(Math.random() * 10) + 1  // 1-10 comments
        ]);
      }
    }

    // Update channel member counts
    await pool.query(`
      UPDATE interest_channels 
      SET member_count = (
        SELECT COUNT(*) 
        FROM interest_channel_members 
        WHERE interest_channel_members.channel_id = interest_channels.id
      )
    `);

    console.log('✅ Realistic Canva data created successfully!');
    console.log(`Created ${canvaEmployees.length} employees across ${channels.length} channels with ${posts.length} meaningful posts`);
    
  } catch (error) {
    console.error('Error creating Canva data:', error);
  } finally {
    await pool.end();
  }
}

createCanvaRealisticData();