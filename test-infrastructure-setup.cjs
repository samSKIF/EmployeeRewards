#!/usr/bin/env node

/**
 * Test Infrastructure Setup Script
 * Restores and validates the testing infrastructure for ThrivioHR
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Test Infrastructure for ThrivioHR...\n');

// Test configuration validation
function validateJestConfig() {
  console.log('1️⃣ Validating Jest Configuration...');
  
  if (!fs.existsSync('jest.config.cjs')) {
    console.error('❌ jest.config.cjs not found');
    return false;
  }
  
  const config = require('./jest.config.cjs');
  const requiredFields = ['preset', 'testEnvironment', 'collectCoverage'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      console.error(`❌ Missing required field: ${field}`);
      return false;
    }
  }
  
  console.log('✅ Jest configuration is valid');
  return true;
}

// Count test files
function countTestFiles() {
  console.log('2️⃣ Scanning Test Files...');
  
  try {
    const result = execSync('find . -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | wc -l', { encoding: 'utf8' });
    const count = parseInt(result.trim());
    
    console.log(`📊 Found ${count} test files`);
    
    if (count === 0) {
      console.error('❌ No test files found');
      return false;
    }
    
    return count;
  } catch (error) {
    console.error('❌ Error counting test files:', error.message);
    return false;
  }
}

// Run sample test
function runSampleTest() {
  console.log('3️⃣ Running Sample Test...');
  
  try {
    execSync('npx jest server/middleware/auth-fixed.test.ts --no-coverage --silent', { 
      stdio: 'inherit',
      timeout: 30000 
    });
    console.log('✅ Sample test passed');
    return true;
  } catch (error) {
    console.error('❌ Sample test failed');
    return false;
  }
}

// Check test coverage capability
function checkCoverageCapability() {
  console.log('4️⃣ Checking Coverage Capability...');
  
  try {
    execSync('npx jest --version', { stdio: 'pipe' });
    console.log('✅ Jest is available for coverage reporting');
    return true;
  } catch (error) {
    console.error('❌ Jest not available:', error.message);
    return false;
  }
}

// Generate test infrastructure report
function generateReport(testCount, validations) {
  console.log('\n📋 Test Infrastructure Status Report');
  console.log('=====================================');
  
  const totalChecks = Object.keys(validations).length;
  const passedChecks = Object.values(validations).filter(Boolean).length;
  const score = Math.round((passedChecks / totalChecks) * 100);
  
  console.log(`Overall Score: ${score}/100`);
  console.log(`Test Files Found: ${testCount}`);
  console.log(`Validation Results:`);
  
  for (const [check, passed] of Object.entries(validations)) {
    console.log(`  ${passed ? '✅' : '❌'} ${check}`);
  }
  
  if (score >= 75) {
    console.log('\n🎉 Test infrastructure is functional!');
    console.log('🚀 Ready for automated quality assurance');
  } else {
    console.log('\n⚠️  Test infrastructure needs attention');
    console.log('🔧 Some components require fixes');
  }
  
  return score;
}

// Main execution
async function main() {
  const validations = {
    'Jest Configuration': validateJestConfig(),
    'Coverage Capability': checkCoverageCapability(),
    'Sample Test Execution': runSampleTest()
  };
  
  const testCount = countTestFiles();
  const score = generateReport(testCount, validations);
  
  console.log('\n🎯 Next Steps:');
  if (score >= 75) {
    console.log('- Run full test suite: npx jest');
    console.log('- Enable coverage reporting: npx jest --coverage');
    console.log('- Set up automated testing workflows');
  } else {
    console.log('- Fix failing test components');
    console.log('- Update test expectations to match current code');
    console.log('- Restore missing test infrastructure');
  }
  
  process.exit(score >= 75 ? 0 : 1);
}

main().catch(console.error);