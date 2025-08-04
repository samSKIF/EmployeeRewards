// BUSINESS CRITICAL: Direct storage validation script
// Identifies root cause of data inconsistencies causing harmful business impact

const { DatabaseStorage } = require('./storage/database-storage');
const { UserStorage } = require('./storage/user-storage');

async function validateStorageConsistency() {
  console.log('=== BUSINESS CRITICAL STORAGE VALIDATION ===');
  
  try {
    const storage = new DatabaseStorage();
    const userStorage = new UserStorage();
    
    console.log('\n1. Testing Direct UserStorage Methods:');
    try {
      const directCount = await userStorage.getUserCount();
      console.log(`   ✓ UserStorage.getUserCount(): ${directCount}`);
    } catch (error) {
      console.error(`   ✗ UserStorage.getUserCount() FAILED: ${error.message}`);
    }
    
    try {
      const directUsers = await userStorage.getUsers();
      console.log(`   ✓ UserStorage.getUsers(): ${directUsers?.length || 0} users`);
    } catch (error) {
      console.error(`   ✗ UserStorage.getUsers() FAILED: ${error.message}`);
    }
    
    console.log('\n2. Testing DatabaseStorage Interface:');
    try {
      const storageCount = await storage.getUserCount();
      console.log(`   ✓ DatabaseStorage.getUserCount(): ${storageCount}`);
    } catch (error) {
      console.error(`   ✗ DatabaseStorage.getUserCount() FAILED: ${error.message}`);
    }
    
    try {
      const storageUsers = await storage.getUsers();
      console.log(`   ✓ DatabaseStorage.getUsers(): ${storageUsers?.length || 0} users`);
    } catch (error) {
      console.error(`   ✗ DatabaseStorage.getUsers() FAILED: ${error.message}`);
    }
    
    console.log('\n3. Testing Organization-Specific Queries:');
    try {
      const canvaUsers = await storage.getUsersByOrganization(1);
      console.log(`   ✓ Canva users (org 1): ${canvaUsers?.length || 0} employees`);
    } catch (error) {
      console.error(`   ✗ getUsersByOrganization(1) FAILED: ${error.message}`);
    }
    
    console.log('\n4. Validating Method Existence:');
    const requiredMethods = [
      'getUsers', 'getUserCount', 'getUsersByOrganization', 
      'getAllUsersWithBalance', 'getUser', 'getUserByEmail'
    ];
    
    for (const method of requiredMethods) {
      const exists = typeof storage[method] === 'function';
      console.log(`   ${exists ? '✓' : '✗'} ${method}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    console.log('\n=== VALIDATION COMPLETE ===');
    
  } catch (error) {
    console.error('CRITICAL VALIDATION FAILURE:', error.message);
    process.exit(1);
  }
}

validateStorageConsistency().catch(console.error);