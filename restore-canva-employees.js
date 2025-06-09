import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreCanvaEmployees() {
  console.log('Restoring original Canva employee data...');

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Original Canva employees that should be restored
    const employees = [
      // Leadership Team
      { username: 'melanie.perkins', email: 'melanie.perkins@canva.com', name: 'Melanie Perkins', department: 'Executive', jobTitle: 'CEO & Co-Founder', isAdmin: true },
      { username: 'cliff.obrecht', email: 'cliff.obrecht@canva.com', name: 'Cliff Obrecht', department: 'Executive', jobTitle: 'COO & Co-Founder', isAdmin: true },
      { username: 'cameron.adams', email: 'cameron.adams@canva.com', name: 'Cameron Adams', department: 'Executive', jobTitle: 'CPO & Co-Founder', isAdmin: true },
      
      // Engineering Team
      { username: 'shams.aranib', email: 'shams.aranib@canva.com', name: 'Shams Aranib', department: 'Human Resources', jobTitle: 'Admin HR', isAdmin: true },
      { username: 'sarah.chen', email: 'sarah.chen@canva.com', name: 'Sarah Chen', department: 'Engineering', jobTitle: 'Senior Software Engineer' },
      { username: 'marcus.rodriguez', email: 'marcus.rodriguez@canva.com', name: 'Marcus Rodriguez', department: 'Engineering', jobTitle: 'Lead Frontend Developer' },
      { username: 'emma.thompson', email: 'emma.thompson@canva.com', name: 'Emma Thompson', department: 'Engineering', jobTitle: 'Backend Engineer' },
      { username: 'david.kim', email: 'david.kim@canva.com', name: 'David Kim', department: 'Engineering', jobTitle: 'DevOps Engineer' },
      { username: 'alex.petrov', email: 'alex.petrov@canva.com', name: 'Alex Petrov', department: 'Engineering', jobTitle: 'Full Stack Developer' },
      { username: 'priya.sharma', email: 'priya.sharma@canva.com', name: 'Priya Sharma', department: 'Engineering', jobTitle: 'Machine Learning Engineer' },
      
      // Design Team
      { username: 'james.wilson', email: 'james.wilson@canva.com', name: 'James Wilson', department: 'Design', jobTitle: 'Head of Design' },
      { username: 'lisa.zhang', email: 'lisa.zhang@canva.com', name: 'Lisa Zhang', department: 'Design', jobTitle: 'Senior UX Designer' },
      { username: 'michael.foster', email: 'michael.foster@canva.com', name: 'Michael Foster', department: 'Design', jobTitle: 'Visual Designer' },
      { username: 'rachel.green', email: 'rachel.green@canva.com', name: 'Rachel Green', department: 'Design', jobTitle: 'Product Designer' },
      
      // Marketing Team
      { username: 'tom.anderson', email: 'tom.anderson@canva.com', name: 'Tom Anderson', department: 'Marketing', jobTitle: 'Head of Marketing' },
      { username: 'jessica.martinez', email: 'jessica.martinez@canva.com', name: 'Jessica Martinez', department: 'Marketing', jobTitle: 'Content Marketing Manager' },
      { username: 'kevin.lee', email: 'kevin.lee@canva.com', name: 'Kevin Lee', department: 'Marketing', jobTitle: 'Growth Marketing Specialist' },
      
      // Sales Team
      { username: 'olivia.brown', email: 'olivia.brown@canva.com', name: 'Olivia Brown', department: 'Sales', jobTitle: 'VP of Sales' },
      { username: 'robert.taylor', email: 'robert.taylor@canva.com', name: 'Robert Taylor', department: 'Sales', jobTitle: 'Enterprise Sales Manager' },
      { username: 'sophia.davis', email: 'sophia.davis@canva.com', name: 'Sophia Davis', department: 'Sales', jobTitle: 'Sales Development Representative' },
      
      // HR & Operations
      { username: 'amanda.clark', email: 'amanda.clark@canva.com', name: 'Amanda Clark', department: 'Human Resources', jobTitle: 'HR Director' },
      { username: 'daniel.wright', email: 'daniel.wright@canva.com', name: 'Daniel Wright', department: 'Operations', jobTitle: 'Operations Manager' },
      { username: 'jennifer.lopez', email: 'jennifer.lopez@canva.com', name: 'Jennifer Lopez', department: 'Human Resources', jobTitle: 'HR Business Partner' },
      
      // Finance & Legal
      { username: 'ryan.mitchell', email: 'ryan.mitchell@canva.com', name: 'Ryan Mitchell', department: 'Finance', jobTitle: 'CFO' },
      { username: 'natalie.cooper', email: 'natalie.cooper@canva.com', name: 'Natalie Cooper', department: 'Legal', jobTitle: 'General Counsel' },
      
      // Product Team
      { username: 'andrew.scott', email: 'andrew.scott@canva.com', name: 'Andrew Scott', department: 'Product', jobTitle: 'VP of Product' },
      { username: 'maria.gonzalez', email: 'maria.gonzalez@canva.com', name: 'Maria Gonzalez', department: 'Product', jobTitle: 'Senior Product Manager' },
      { username: 'chris.evans', email: 'chris.evans@canva.com', name: 'Chris Evans', department: 'Product', jobTitle: 'Product Manager' },
      
      // Customer Success
      { username: 'samantha.white', email: 'samantha.white@canva.com', name: 'Samantha White', department: 'Customer Success', jobTitle: 'Head of Customer Success' },
      { username: 'brian.johnson', email: 'brian.johnson@canva.com', name: 'Brian Johnson', department: 'Customer Success', jobTitle: 'Customer Success Manager' },
      
      // Data & Analytics
      { username: 'emily.watson', email: 'emily.watson@canva.com', name: 'Emily Watson', department: 'Data', jobTitle: 'Head of Data' },
      { username: 'jonathan.miller', email: 'jonathan.miller@canva.com', name: 'Jonathan Miller', department: 'Data', jobTitle: 'Data Scientist' },
      
      // Quality Assurance
      { username: 'grace.lee', email: 'grace.lee@canva.com', name: 'Grace Lee', department: 'Engineering', jobTitle: 'QA Lead' },
      { username: 'tyler.brown', email: 'tyler.brown@canva.com', name: 'Tyler Brown', department: 'Engineering', jobTitle: 'QA Engineer' },
      
      // Security
      { username: 'victoria.hall', email: 'victoria.hall@canva.com', name: 'Victoria Hall', department: 'Security', jobTitle: 'Head of Security' },
      { username: 'ethan.moore', email: 'ethan.moore@canva.com', name: 'Ethan Moore', department: 'Security', jobTitle: 'Security Engineer' },
      
      // International Teams
      { username: 'sophie.martin', email: 'sophie.martin@canva.com', name: 'Sophie Martin', department: 'International', jobTitle: 'Country Manager - France' },
      { username: 'lucas.silva', email: 'lucas.silva@canva.com', name: 'Lucas Silva', department: 'International', jobTitle: 'Country Manager - Brazil' },
      { username: 'yuki.tanaka', email: 'yuki.tanaka@canva.com', name: 'Yuki Tanaka', department: 'International', jobTitle: 'Country Manager - Japan' },
      
      // Additional team members
      { username: 'noah.wilson', email: 'noah.wilson@canva.com', name: 'Noah Wilson', department: 'Engineering', jobTitle: 'Software Engineer' },
      { username: 'ava.garcia', email: 'ava.garcia@canva.com', name: 'Ava Garcia', department: 'Design', jobTitle: 'UX Researcher' },
      { username: 'liam.martinez', email: 'liam.martinez@canva.com', name: 'Liam Martinez', department: 'Marketing', jobTitle: 'Brand Manager' },
      { username: 'zoe.anderson', email: 'zoe.anderson@canva.com', name: 'Zoe Anderson', department: 'Product', jobTitle: 'Associate Product Manager' },
      { username: 'mason.thomas', email: 'mason.thomas@canva.com', name: 'Mason Thomas', department: 'Sales', jobTitle: 'Account Executive' },
      { username: 'chloe.jackson', email: 'chloe.jackson@canva.com', name: 'Chloe Jackson', department: 'Customer Success', jobTitle: 'Customer Success Specialist' },
      { username: 'isaac.white', email: 'isaac.white@canva.com', name: 'Isaac White', department: 'Data', jobTitle: 'Analytics Engineer' },
      { username: 'maya.harris', email: 'maya.harris@canva.com', name: 'Maya Harris', department: 'Human Resources', jobTitle: 'Talent Acquisition Manager' },
      { username: 'owen.clark', email: 'owen.clark@canva.com', name: 'Owen Clark', department: 'Operations', jobTitle: 'Business Operations Analyst' },
      { username: 'lily.lewis', email: 'lily.lewis@canva.com', name: 'Lily Lewis', department: 'Finance', jobTitle: 'Financial Analyst' }
    ];

    // Insert employees with proper conflict handling
    for (const employee of employees) {
      const values = [
        employee.username,
        employee.email,
        employee.name,
        hashedPassword,
        employee.isAdmin || false,
        employee.department,
        employee.jobTitle,
        1, // organization_id
        'active',
        869 // created_by (admin user)
      ];

      await pool.query(`
        INSERT INTO users (
          username, email, name, password, is_admin, department, job_title, 
          organization_id, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          department = EXCLUDED.department,
          job_title = EXCLUDED.job_title,
          is_admin = EXCLUDED.is_admin,
          status = EXCLUDED.status
      `, values);
    }

    console.log(`Successfully restored ${employees.length} Canva employees`);
    
    // Verify the restoration
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE email LIKE '%canva.com'
    `);
    
    console.log(`Total Canva employees in database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('Error restoring employee data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the restoration
restoreCanvaEmployees().catch(console.error);