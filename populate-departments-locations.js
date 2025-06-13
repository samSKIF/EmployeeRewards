/**
 * Script to populate departments and locations from existing employee data
 * Extracts unique departments and locations from the users table
 */

const { Pool } = require('pg');

async function populateDepartmentsAndLocations() {
  console.log('Starting departments and locations population...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get unique departments from users table
    console.log('Extracting unique departments...');
    const departmentsResult = await pool.query(`
      SELECT DISTINCT department 
      FROM users 
      WHERE department IS NOT NULL 
        AND department != '' 
        AND "organizationId" = 1
      ORDER BY department
    `);

    const departments = departmentsResult.rows.map(row => row.department);
    console.log(`Found ${departments.length} unique departments:`, departments);

    // Get unique locations from users table
    console.log('Extracting unique locations...');
    const locationsResult = await pool.query(`
      SELECT DISTINCT location 
      FROM users 
      WHERE location IS NOT NULL 
        AND location != '' 
        AND "organizationId" = 1
      ORDER BY location
    `);

    const locations = locationsResult.rows.map(row => row.location);
    console.log(`Found ${locations.length} unique locations:`, locations);

    // Create departments table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        "organizationId" INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, "organizationId")
      )
    `);

    // Create locations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "organizationId" INTEGER NOT NULL DEFAULT 1,
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, "organizationId")
      )
    `);

    // Insert departments
    console.log('Inserting departments...');
    for (const department of departments) {
      try {
        await pool.query(`
          INSERT INTO departments (name, "organizationId", description)
          VALUES ($1, 1, $2)
          ON CONFLICT (name, "organizationId") DO NOTHING
        `, [department, `${department} department at Canva`]);
        console.log(`✓ Inserted department: ${department}`);
      } catch (error) {
        console.log(`⚠ Skipped department ${department}: ${error.message}`);
      }
    }

    // Insert locations
    console.log('Inserting locations...');
    for (const location of locations) {
      try {
        // Extract city and country if location format is "City, Country"
        const [city, country] = location.includes(',') 
          ? location.split(',').map(s => s.trim())
          : [location, null];

        await pool.query(`
          INSERT INTO locations (name, "organizationId", city, country)
          VALUES ($1, 1, $2, $3)
          ON CONFLICT (name, "organizationId") DO NOTHING
        `, [location, city, country]);
        console.log(`✓ Inserted location: ${location}`);
      } catch (error) {
        console.log(`⚠ Skipped location ${location}: ${error.message}`);
      }
    }

    // Verify the data
    const departmentCount = await pool.query('SELECT COUNT(*) FROM departments WHERE "organizationId" = 1');
    const locationCount = await pool.query('SELECT COUNT(*) FROM locations WHERE "organizationId" = 1');

    console.log('\n=== SUMMARY ===');
    console.log(`✓ Successfully populated ${departmentCount.rows[0].count} departments`);
    console.log(`✓ Successfully populated ${locationCount.rows[0].count} locations`);
    console.log('\nDepartments and locations are now available for filtering and organization.');

  } catch (error) {
    console.error('Error populating departments and locations:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  populateDepartmentsAndLocations()
    .then(() => {
      console.log('Departments and locations population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to populate departments and locations:', error);
      process.exit(1);
    });
}

module.exports = { populateDepartmentsAndLocations };