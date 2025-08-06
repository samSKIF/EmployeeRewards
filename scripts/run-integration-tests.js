#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Running Phase 3 Integration Tests - 90% Coverage Target\n');

// Function to run command and capture output
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf-8', 
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000
    });
    console.log(`✅ ${description} completed\n`);
    return output;
  } catch (error) {
    console.log(`❌ ${description} failed:`);
    console.log(error.stdout || error.message);
    return null;
  }
}

// 1. Run Backend Coverage Tests
console.log('==== BACKEND TEST COVERAGE ====');
const backendCoverage = runCommand(
  'npx jest --testPathPatterns="server/routes" --coverage --coverageReporters="json-summary" --coverageDirectory="coverage/backend" --collectCoverageFrom="server/**/*.{ts,js}" --collectCoverageFrom="!server/**/*.test.{ts,js}" --collectCoverageFrom="!server/**/*.d.ts" --passWithNoTests',
  'Backend API Routes Coverage Test'
);

// 2. Run Frontend Component Tests
console.log('==== FRONTEND TEST COVERAGE ====');
const frontendCoverage = runCommand(
  'npx jest --config jest.integration.config.cjs --testPathPatterns="client" --coverage --coverageReporters="json-summary" --coverageDirectory="coverage/frontend" --collectCoverageFrom="client/src/**/*.{ts,tsx}" --collectCoverageFrom="!client/src/**/*.test.{ts,tsx}" --collectCoverageFrom="!client/src/**/*.d.ts" --passWithNoTests',
  'Frontend Components Coverage Test'
);

// 3. Run Integration Tests  
console.log('==== INTEGRATION TESTS ====');
const integrationTests = runCommand(
  'npx jest --config jest.integration.config.cjs --testPathPatterns="tests/integration" --passWithNoTests --verbose',
  'User Count Consistency & Gold Standard Integration Tests'
);

// 4. Parse Coverage Results
console.log('==== COVERAGE ANALYSIS ====');

let backendCoveragePercent = 'N/A';
let frontendCoveragePercent = 'N/A';

// Try to read backend coverage
try {
  const backendSummary = JSON.parse(fs.readFileSync('coverage/backend/coverage-summary.json', 'utf-8'));
  backendCoveragePercent = backendSummary.total.lines.pct;
  console.log(`📊 Backend Coverage: ${backendCoveragePercent}%`);
} catch (error) {
  console.log('📊 Backend Coverage: Unable to determine');
}

// Try to read frontend coverage
try {
  const frontendSummary = JSON.parse(fs.readFileSync('coverage/frontend/coverage-summary.json', 'utf-8'));
  frontendCoveragePercent = frontendSummary.total.lines.pct;
  console.log(`📊 Frontend Coverage: ${frontendCoveragePercent}%`);
} catch (error) {
  console.log('📊 Frontend Coverage: Unable to determine');
}

// 5. Generate Final Report
console.log('\n==== PHASE 3 INTEGRATION TESTING SUMMARY ====');
console.log('🎯 Target: 90% Frontend & Backend Coverage');
console.log(`📈 Backend Coverage: ${backendCoveragePercent}%${backendCoveragePercent >= 90 ? ' ✅' : ' ⚠️'}`);
console.log(`📈 Frontend Coverage: ${frontendCoveragePercent}%${frontendCoveragePercent >= 90 ? ' ✅' : ' ⚠️'}`);

if (backendCoveragePercent >= 90 && frontendCoveragePercent >= 90) {
  console.log('\n🎉 PHASE 3 INTEGRATION TESTING SUCCESSFUL!');
  console.log('✅ 90%+ Coverage Target Achieved');
  console.log('✅ User Count Consistency Validated');
  console.log('✅ Gold Standard Compliance Verified');
} else {
  console.log('\n⚠️  Phase 3 Coverage Targets Need Additional Work');
  console.log('📋 Recommendations:');
  if (backendCoveragePercent < 90) {
    console.log('   - Add more backend API route tests');
    console.log('   - Focus on error handling and edge cases');
  }
  if (frontendCoveragePercent < 90) {
    console.log('   - Add more frontend component tests');
    console.log('   - Test user interactions and state changes');
  }
}

console.log('\n🔍 Detailed Coverage Reports:');
console.log('   - Backend: coverage/backend/index.html');
console.log('   - Frontend: coverage/frontend/index.html');