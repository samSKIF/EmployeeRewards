/**
 * Test script for duplicate validation system
 */

const { db } = require('./server/db.js');
const { storage } = require('./server/storage.js');

async function testDuplicateValidation() {
  console.log('Testing duplicate validation system...');

  try {
    // Test 1: Check for existing email duplicate
    console.log('\n1. Testing email duplicate check...');
    const emailCheck = await storage.checkDuplicateUser('shams.aranib@canva.com');
    console.log('Email duplicate check result:', emailCheck);

    // Test 2: Check for existing name duplicate
    console.log('\n2. Testing name duplicate check...');
    const nameCheck = await storage.checkDuplicateUser('test@example.com', 'Justin', 'Turner');
    console.log('Name duplicate check result:', nameCheck);

    // Test 3: Test new user creation with duplicate email (should fail)
    console.log('\n3. Testing user creation with duplicate email...');
    try {
      await storage.createUser({
        email: 'shams.aranib@canva.com',
        name: 'Test',
        surname: 'User',
        username: 'testuser',
        password: 'password123',
        department: 'Test',
        location: 'Test Location'
      });
      console.log('ERROR: Duplicate email creation should have failed!');
    } catch (error) {
      console.log('SUCCESS: Duplicate email blocked:', error.message);
    }

    // Test 4: Test new user creation with duplicate name (should fail)
    console.log('\n4. Testing user creation with duplicate name...');
    try {
      await storage.createUser({
        email: 'newuser@test.com',
        name: 'Justin',
        surname: 'Turner',
        username: 'newjustin',
        password: 'password123',
        department: 'Test',
        location: 'Test Location'
      });
      console.log('ERROR: Duplicate name creation should have failed!');
    } catch (error) {
      console.log('SUCCESS: Duplicate name blocked:', error.message);
    }

    // Test 5: Test valid new user creation (should succeed)
    console.log('\n5. Testing valid user creation...');
    try {
      const newUser = await storage.createUser({
        email: 'uniqueuser@test.com',
        name: 'Unique',
        surname: 'User',
        username: 'uniqueuser',
        password: 'password123',
        department: 'Test',
        location: 'Test Location'
      });
      console.log('SUCCESS: Valid user created:', newUser.email);

      // Clean up - delete the test user
      await db.delete(require('./shared/schema.js').users).where(
        require('drizzle-orm').eq(require('./shared/schema.js').users.id, newUser.id)
      );
      console.log('Test user cleaned up');
    } catch (error) {
      console.log('ERROR: Valid user creation failed:', error.message);
    }

    console.log('\nDuplicate validation test completed!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDuplicateValidation();