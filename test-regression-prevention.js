#!/usr/bin/env node

/**
 * COMPREHENSIVE REGRESSION PREVENTION TEST RUNNER
 * 
 * This script runs all user count consistency tests and validates that
 * the three critical locations show the correct values:
 * 
 * ✅ Employee Directory: 402 users (billable count)
 * ✅ Corporate Organizations: 403 users (includes super user) 
 * ✅ Subscription Management: 402 users (billable count)
 * 
 * Run this script after any changes to user counting logic to ensure
 * no regressions are introduced.
 */

import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

console.log('🔍 STARTING COMPREHENSIVE REGRESSION PREVENTION TEST SUITE');
console.log('=' .repeat(80));

async function runTest(testFile, description) {
  console.log(`\n📋 ${description}`);
  console.log('-'.repeat(50));
  
  try {
    const { stdout, stderr } = await execAsync(`npm test -- ${testFile}`);
    
    if (stderr && !stderr.includes('PASS')) {
      console.log('❌ FAILED:', stderr);
      return false;
    }
    
    console.log('✅ PASSED');
    return true;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function runAPIConsistencyTest() {
  console.log(`\n📋 API Endpoint User Count Consistency Test`);
  console.log('-'.repeat(50));
  
  try {
    const { stdout } = await execAsync('node test-canva-user-counts.js');
    console.log(stdout);
    
    // Check if all counts are correct
    if (stdout.includes('Employee Directory: 402 users') && 
        stdout.includes('Corporate Organizations: 403 users') && 
        stdout.includes('Subscription Management: 402 users')) {
      console.log('✅ API CONSISTENCY PASSED');
      return true;
    } else {
      console.log('❌ API CONSISTENCY FAILED - Inconsistent counts detected');
      return false;
    }
  } catch (error) {
    console.log('❌ API TEST ERROR:', error.message);
    return false;
  }
}

async function main() {
  const testResults = [];
  
  // 1. Run API consistency test first
  testResults.push(await runAPIConsistencyTest());
  
  // 2. Run comprehensive unit tests
  testResults.push(await runTest('tests/user-count-consistency.test.js', 
    'User Count Consistency Tests'));
  
  testResults.push(await runTest('tests/frontend-data-consistency.test.js', 
    'Frontend Data Source Consistency Tests'));
    
  testResults.push(await runTest('tests/sql-standardization.test.js', 
    'SQL Query Standardization Tests'));
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 REGRESSION PREVENTION TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passedTests = testResults.filter(result => result).length;
  const totalTests = testResults.length;
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL REGRESSION TESTS PASSED!');
    console.log('✅ User count consistency is maintained across all locations');
    console.log('✅ No regressions detected in user counting logic');
    console.log('✅ SQL queries use standardized patterns');
    console.log('✅ Frontend components use consistent data sources');
    
    console.log('\n🔒 REGRESSION PROTECTION ACTIVE:');
    console.log('   Employee Directory: Shows 402 billable users (org-scoped)');
    console.log('   Corporate Organizations: Shows 403 total users (includes super user)');
    console.log('   Subscription Management: Shows 402 billable users (org-scoped)');
    
    process.exit(0);
  } else {
    console.log(`❌ ${totalTests - passedTests}/${totalTests} TESTS FAILED`);
    console.log('🚨 REGRESSION DETECTED! User count inconsistencies found.');
    console.log('\n💡 Action Required:');
    console.log('   1. Check API endpoints return correct user counts');
    console.log('   2. Verify frontend components use API data (not calculations)');
    console.log('   3. Ensure SQL queries use standardized CASE WHEN patterns');
    console.log('   4. Confirm super user inclusion/exclusion rules are correct');
    
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

main().catch(error => {
  console.log('❌ Test suite failed:', error.message);
  process.exit(1);
});