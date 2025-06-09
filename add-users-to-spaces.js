/**
 * Script to add real users to channels and assign profile pictures
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon connection
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Profile picture collections based on demographics
const profilePictures = {
  male: {
    young: { // 20-35
      western: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534308143481-c55c271b2c8f?w=150&h=150&fit=crop&crop=face'
      ]
    },
    middle: { // 35-50
      western: [
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=150&h=150&fit=crop&crop=face'
      ]
    }
  },
  female: {
    young: { // 20-35
      western: [
        'https://images.unsplash.com/photo-1494790108755-2616b612b607?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582233479366-6d38bc390a08?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&h=150&fit=crop&crop=face'
      ]
    },
    middle: { // 35-50
      western: [
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1591084728795-1149f32d9866?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face'
      ]
    }
  }
};

// Name patterns for ethnicity detection
const ethnicityPatterns = {
  asian: [
    'chen', 'wong', 'lee', 'kim', 'park', 'zhang', 'liu', 'wang', 'li', 'zhao', 'huang', 'wu',
    'tanaka', 'sato', 'suzuki', 'takahashi', 'watanabe', 'yamamoto', 'kobayashi', 'ito',
    'patel', 'sharma', 'singh', 'kumar', 'gupta', 'agarwal', 'shah', 'mehta'
  ],
  hispanic: [
    'garcia', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'perez', 'sanchez',
    'ramirez', 'torres', 'flores', 'rivera', 'gomez', 'diaz', 'reyes', 'morales'
  ],
  african: [
    'johnson', 'jackson', 'washington', 'harris', 'thompson', 'wilson', 'wright', 'davis',
    'okafor', 'adebayo', 'williams', 'brown', 'jones', 'miller', 'moore', 'taylor'
  ]
};

function detectEthnicity(name) {
  const fullName = name.toLowerCase();
  
  for (const [ethnicity, patterns] of Object.entries(ethnicityPatterns)) {
    if (patterns.some(pattern => fullName.includes(pattern))) {
      return ethnicity;
    }
  }
  
  return 'western'; // default
}

function calculateAge(birthDate) {
  if (!birthDate) return 30; // default age
  
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1;
  }
  
  return age;
}

function getAgeCategory(age) {
  return age < 35 ? 'young' : 'middle';
}

function selectProfilePicture(gender, age, ethnicity) {
  const ageCategory = getAgeCategory(age);
  const genderPics = profilePictures[gender] || profilePictures.male;
  const agePics = genderPics[ageCategory] || genderPics.young;
  const ethnicityPics = agePics[ethnicity] || agePics.western;
  
  return ethnicityPics[Math.floor(Math.random() * ethnicityPics.length)];
}

async function addUsersToChannelsAndUpdateProfiles() {
  const client = await pool.connect();
  
  try {
    console.log('Starting user assignment to channels and profile picture updates...');
    
    // Get all users from Canva.com
    const usersResult = await client.query(`
      SELECT id, name, surname, email, sex, nationality, birth_date, avatar_url
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
    
    // Update profile pictures for 70% of users
    const usersToUpdate = users.slice(0, Math.floor(users.length * 0.7));
    
    for (const user of usersToUpdate) {
      if (user.avatar_url) {
        console.log(`User ${user.name} already has profile picture, skipping...`);
        continue;
      }
      
      const gender = user.sex?.toLowerCase() === 'female' ? 'female' : 'male';
      const age = calculateAge(user.birth_date);
      const ethnicity = detectEthnicity(`${user.name} ${user.surname || ''}`);
      
      const profilePicUrl = selectProfilePicture(gender, age, ethnicity);
      
      await client.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [profilePicUrl, user.id]
      );
      
      console.log(`Updated ${user.name} (${gender}, age ${age}, ${ethnicity}) with profile picture`);
    }
    
    // Add users to channels based on department/location matching
    for (const channel of channels) {
      console.log(`\nProcessing channel: ${channel.name}`);
      
      let eligibleUsers = users;
      
      // Filter by department if specified
      if (channel.allowed_departments && channel.allowed_departments.length > 0) {
        const deptUsersResult = await client.query(`
          SELECT DISTINCT u.id, u.name, u.department
          FROM users u 
          WHERE u.email LIKE '%@canva.com' 
          AND u.department = ANY($1)
        `, [channel.allowed_departments]);
        
        eligibleUsers = deptUsersResult.rows;
        console.log(`Filtered to ${eligibleUsers.length} users by department: ${channel.allowed_departments.join(', ')}`);
      }
      
      // Filter by location if specified
      if (channel.allowed_sites && channel.allowed_sites.length > 0) {
        const locationUsersResult = await client.query(`
          SELECT DISTINCT u.id, u.name, u.location
          FROM users u 
          WHERE u.email LIKE '%@canva.com' 
          AND u.location = ANY($1)
        `, [channel.allowed_sites]);
        
        eligibleUsers = locationUsersResult.rows;
        console.log(`Filtered to ${eligibleUsers.length} users by location: ${channel.allowed_sites.join(', ')}`);
      }
      
      // For interest-based channels, add more diverse membership (30-80% of eligible users)
      const membershipRate = channel.channel_type === 'interest' ? 
        Math.random() * 0.5 + 0.3 : // 30-80%
        Math.random() * 0.4 + 0.6;   // 60-100% for other types
      
      const usersToAdd = eligibleUsers
        .sort(() => Math.random() - 0.5) // shuffle
        .slice(0, Math.floor(eligibleUsers.length * membershipRate));
      
      console.log(`Adding ${usersToAdd.length} users to channel ${channel.name}`);
      
      // Add users to channel
      for (const user of usersToAdd) {
        try {
          await client.query(`
            INSERT INTO interest_channel_members (channel_id, user_id, joined_at, role)
            VALUES ($1, $2, NOW(), 'member')
            ON CONFLICT (channel_id, user_id) DO NOTHING
          `, [channel.id, user.id]);
        } catch (error) {
          console.log(`User ${user.name} already in channel ${channel.name} or error occurred`);
        }
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
    }
    
    console.log('\n✅ Successfully added users to channels and updated profile pictures');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

// Run the script
addUsersToChannelsAndUpdateProfiles()
  .then(() => process.exit(0))
  .catch(console.error);