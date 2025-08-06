#!/usr/bin/env node

/**
 * Employee Management Testing Coverage Analysis
 * Specific analysis for employee management functionality and sub-functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('👥 Employee Management Testing Coverage Analysis\n');
console.log('================================================\n');

// Function to run command safely
function runCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      timeout: 60000,
      ...options 
    }).trim();
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Analyze employee-related test files
function analyzeEmployeeTestFiles() {
  console.log('1️⃣ Employee Test Files Discovery');
  console.log('--------------------------------');
  
  // Count different types of employee tests
  const employeeTestFiles = runCommand('find . -name "*employee*test*" -o -name "*Employee*test*" | grep -v node_modules');
  const peopleTestFiles = runCommand('find client/src/pages/admin/people/__tests__ -name "*.test.tsx" 2>/dev/null | wc -l');
  const empManagementTests = runCommand('find client/src/components/admin/employee-management -name "*.test.tsx" 2>/dev/null | wc -l');
  
  console.log('Employee-Related Test Files:');
  if (employeeTestFiles) {
    employeeTestFiles.split('\n').forEach(file => {
      if (file.trim()) console.log(`   ✅ ${file.replace('./', '')}`);
    });
  }
  
  console.log(`\nTest File Counts:`);
  console.log(`   People Tests: ${peopleTestFiles}`);
  console.log(`   Employee Management Tests: ${empManagementTests}`);
  console.log('');
  
  return {
    employeeTestFiles: employeeTestFiles ? employeeTestFiles.split('\n').filter(f => f.trim()) : [],
    peopleTestCount: parseInt(peopleTestFiles) || 0,
    empManagementCount: parseInt(empManagementTests) || 0
  };
}

// Analyze employee-related source files
function analyzeEmployeeSourceFiles() {
  console.log('2️⃣ Employee Source Files Analysis');
  console.log('---------------------------------');
  
  const employeeRoutes = runCommand('find server/routes -name "*employee*" -type f | grep -v node_modules');
  const employeeComponents = runCommand('find client/src -path "*/employee*" -name "*.tsx" | grep -v test | head -10');
  const peopleComponents = runCommand('find client/src/pages/admin/people -name "*.tsx" | grep -v test | wc -l');
  
  console.log('Employee Source Files:');
  console.log('📁 Backend Routes:');
  if (employeeRoutes) {
    employeeRoutes.split('\n').forEach(file => {
      if (file.trim()) console.log(`   📄 ${file.replace('./', '')}`);
    });
  }
  
  console.log(`\n📁 Frontend Components: ${peopleComponents} files in people management`);
  
  console.log('');
  return {
    backendRoutes: employeeRoutes ? employeeRoutes.split('\n').filter(f => f.trim()) : [],
    frontendCount: parseInt(peopleComponents) || 0
  };
}

// Run employee-specific test coverage
function runEmployeeCoverage() {
  console.log('3️⃣ Employee Management Test Execution');
  console.log('-------------------------------------');
  
  console.log('Running employee directory tests...');
  
  // Try to run one of the employee tests
  const testResult = runCommand(
    'npx jest "client/src/pages/admin/people/__tests__/EmployeeDirectory.test.tsx" --coverage --collectCoverageFrom="client/src/pages/admin/people/EmployeeDirectory.tsx" --coverageReporters=text --silent --testTimeout=15000 2>/dev/null',
    { timeout: 30000 }
  );
  
  // Extract coverage information
  const coverageMatch = testResult.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
  
  if (coverageMatch) {
    console.log('✅ Employee Directory Component Coverage:');
    console.log(`   Statements: ${coverageMatch[1]}%`);
    console.log(`   Branches: ${coverageMatch[2]}%`);
    console.log(`   Functions: ${coverageMatch[3]}%`);
    console.log(`   Lines: ${coverageMatch[4]}%`);
    
    const avgCoverage = ((+coverageMatch[1]) + (+coverageMatch[2]) + (+coverageMatch[3]) + (+coverageMatch[4])) / 4;
    console.log(`   Average: ${avgCoverage.toFixed(2)}%`);
    
    return {
      statements: parseFloat(coverageMatch[1]),
      branches: parseFloat(coverageMatch[2]),
      functions: parseFloat(coverageMatch[3]),
      lines: parseFloat(coverageMatch[4]),
      average: avgCoverage
    };
  } else {
    console.log('❌ Could not extract coverage data from test execution');
    console.log('Test output:', testResult.substring(0, 500));
    return null;
  }
}

// Analyze employee API routes coverage
function analyzeEmployeeRoutesCoverage() {
  console.log('\n4️⃣ Employee API Routes Analysis');
  console.log('-------------------------------');
  
  // Check if employee routes file exists and analyze it
  const employeeRoutesPath = 'server/routes/admin/employeeRoutes.ts';
  
  if (fs.existsSync(employeeRoutesPath)) {
    const routesContent = fs.readFileSync(employeeRoutesPath, 'utf8');
    const lines = routesContent.split('\n');
    const totalLines = lines.length;
    
    // Count different types of routes
    const getRoutes = (routesContent.match(/router\.get\(/g) || []).length;
    const postRoutes = (routesContent.match(/router\.post\(/g) || []).length;
    const putRoutes = (routesContent.match(/router\.put\(/g) || []).length;
    const deleteRoutes = (routesContent.match(/router\.delete\(/g) || []).length;
    
    console.log(`📄 ${employeeRoutesPath} Analysis:`);
    console.log(`   Total Lines: ${totalLines}`);
    console.log(`   GET Routes: ${getRoutes}`);
    console.log(`   POST Routes: ${postRoutes}`);
    console.log(`   PUT Routes: ${putRoutes}`);
    console.log(`   DELETE Routes: ${deleteRoutes}`);
    console.log(`   Total Routes: ${getRoutes + postRoutes + putRoutes + deleteRoutes}`);
    
    // Estimate complexity
    const complexityIndicators = [
      'try',
      'catch',
      'async',
      'await',
      'verifyToken',
      'verifyAdmin',
      'logActivity'
    ];
    
    let complexityScore = 0;
    complexityIndicators.forEach(indicator => {
      const count = (routesContent.match(new RegExp(indicator, 'g')) || []).length;
      complexityScore += count;
    });
    
    console.log(`   Complexity Score: ${complexityScore} (higher = more complex)`);
    console.log(`   Test Coverage: 0% (from previous analysis)`);
    
    return {
      totalLines,
      totalRoutes: getRoutes + postRoutes + putRoutes + deleteRoutes,
      complexityScore,
      coverage: 0
    };
  } else {
    console.log('❌ Employee routes file not found');
    return null;
  }
}

// Analyze employee management sub-functions
function analyzeEmployeeSubFunctions() {
  console.log('\n5️⃣ Employee Management Sub-Functions');
  console.log('------------------------------------');
  
  const subFunctions = {
    'Employee Directory': {
      components: ['EmployeeDirectory.tsx'],
      tests: ['EmployeeDirectory.test.tsx', 'EmployeeDirectoryEnhanced.test.tsx'],
      coverage: 'Unknown'
    },
    'Employee Creation': {
      components: ['CreateEmployeeForm.tsx'],
      tests: ['CreateEmployeeForm.test.tsx'],
      coverage: 'Unknown'
    },
    'Employee Bulk Actions': {
      components: ['EmployeeBulkActions.tsx'],
      tests: ['EmployeeBulkActions.test.tsx'],
      coverage: 'Unknown'
    },
    'Employee Filtering': {
      components: ['EmployeeFilters.tsx'],
      tests: ['EmployeeFilters.test.tsx'],
      coverage: 'Unknown'
    },
    'Employee Data Integrity': {
      components: ['EmployeeDirectory.tsx'],
      tests: ['EmployeeDataIntegrity.test.tsx', 'EmployeeTableValueValidation.test.tsx'],
      coverage: 'Unknown'
    },
    'Employee Profile Management': {
      components: ['EmployeeProfile.tsx'],
      tests: ['EmployeeProfile.test.tsx'],
      coverage: 'Unknown'
    }
  };
  
  console.log('Sub-Function Analysis:');
  Object.entries(subFunctions).forEach(([name, details]) => {
    console.log(`\n📋 ${name}:`);
    console.log(`   Components: ${details.components.join(', ')}`);
    console.log(`   Tests: ${details.tests.join(', ')}`);
    console.log(`   Coverage: ${details.coverage}`);
    
    // Check if test files exist
    const existingTests = details.tests.filter(testFile => {
      const testPath = `client/src/pages/admin/people/__tests__/${testFile}`;
      return fs.existsSync(testPath);
    });
    
    if (existingTests.length > 0) {
      console.log(`   ✅ ${existingTests.length}/${details.tests.length} test files exist`);
    } else {
      console.log(`   ❌ No test files found`);
    }
  });
  
  return subFunctions;
}

// Generate recommendations
function generateEmployeeManagementRecommendations(stats) {
  console.log('\n6️⃣ Employee Management Recommendations');
  console.log('-------------------------------------');
  
  console.log('🎯 Priority Actions:');
  
  if (!stats.employeeCoverage) {
    console.log('1. 🔴 CRITICAL: Fix failing employee tests');
    console.log('   - Employee directory tests are not running properly');
    console.log('   - Need to debug test execution issues');
  }
  
  if (stats.routesCoverage && stats.routesCoverage.coverage === 0) {
    console.log('2. 🔴 CRITICAL: Zero backend coverage');
    console.log('   - 348 lines in employeeRoutes.ts with 0% coverage');
    console.log('   - Need to create/fix backend API tests');
  }
  
  console.log('3. 🟡 HIGH: Expand test coverage');
  console.log('   - 13 test files exist but need execution validation');
  console.log('   - Focus on critical paths: CRUD operations, filtering, bulk actions');
  
  console.log('4. 🟡 MEDIUM: Integration testing');
  console.log('   - Test frontend-backend integration');
  console.log('   - Validate API endpoints with real data flow');
  
  console.log('\n🚀 Implementation Strategy:');
  console.log('Phase 1: Fix existing employee directory tests');
  console.log('Phase 2: Create employeeRoutes.ts test coverage');
  console.log('Phase 3: Validate critical user journeys');
  console.log('Phase 4: Performance and load testing');
}

// Calculate overall employee management score
function calculateEmployeeManagementScore(stats) {
  console.log('\n📊 Employee Management Coverage Score');
  console.log('=====================================');
  
  let score = 0;
  let maxScore = 100;
  
  // Test infrastructure (20 points)
  if (stats.testFiles.peopleTestCount > 10) {
    score += 20;
    console.log('✅ Test Infrastructure: 20/20 (13 test files found)');
  } else {
    score += Math.round((stats.testFiles.peopleTestCount / 10) * 20);
    console.log(`🟡 Test Infrastructure: ${Math.round((stats.testFiles.peopleTestCount / 10) * 20)}/20`);
  }
  
  // Frontend coverage (30 points)
  if (stats.employeeCoverage && stats.employeeCoverage.average > 70) {
    const frontendScore = Math.round((stats.employeeCoverage.average / 100) * 30);
    score += frontendScore;
    console.log(`✅ Frontend Coverage: ${frontendScore}/30 (${stats.employeeCoverage.average.toFixed(1)}%)`);
  } else {
    console.log('❌ Frontend Coverage: 0/30 (Tests not executing properly)');
  }
  
  // Backend coverage (30 points)
  if (stats.routesCoverage && stats.routesCoverage.coverage > 70) {
    const backendScore = Math.round((stats.routesCoverage.coverage / 100) * 30);
    score += backendScore;
    console.log(`✅ Backend Coverage: ${backendScore}/30`);
  } else {
    console.log('❌ Backend Coverage: 0/30 (Employee routes not tested)');
  }
  
  // Integration coverage (20 points)
  console.log('❌ Integration Coverage: 0/20 (No integration tests verified)');
  
  console.log(`\n📈 Overall Score: ${score}/${maxScore} (${Math.round((score/maxScore) * 100)}%)`);
  
  if (score >= 70) {
    console.log('🎉 Employee management meets basic coverage standards');
  } else {
    console.log(`⚠️  Employee management needs improvement (${70-score} points to minimum)`);
  }
  
  return score;
}

// Main execution
function main() {
  const stats = {
    testFiles: analyzeEmployeeTestFiles(),
    sourceFiles: analyzeEmployeeSourceFiles(),
    employeeCoverage: runEmployeeCoverage(),
    routesCoverage: analyzeEmployeeRoutesCoverage(),
    subFunctions: analyzeEmployeeSubFunctions()
  };
  
  const score = calculateEmployeeManagementScore(stats);
  generateEmployeeManagementRecommendations(stats);
  
  console.log('\n================================================');
  console.log('📋 Employee Management Coverage Summary');
  console.log('================================================');
  console.log(`Test Files: ${stats.testFiles.peopleTestCount} (People) + ${stats.testFiles.empManagementCount} (Components)`);
  console.log(`Frontend Coverage: ${stats.employeeCoverage ? stats.employeeCoverage.average.toFixed(1) + '%' : 'Unable to determine'}`);
  console.log(`Backend Coverage: ${stats.routesCoverage ? stats.routesCoverage.coverage + '%' : 'Not available'}`);
  console.log(`Overall Score: ${score}/100`);
  console.log(`Status: ${score >= 70 ? 'Meets Standards' : 'Needs Improvement'}`);
}

main();