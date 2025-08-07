#!/usr/bin/env tsx

/**
 * Comprehensive test for Employee Core Service
 * Tests all endpoints and functionality
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const SERVICE_PORT = 3001;
const SERVICE_URL = `http://localhost:${SERVICE_PORT}`;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  responseCode?: number;
}

const testResults: TestResult[] = [];
let authToken: string | null = null;
let testUserId: number | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(
  endpoint: string,
  method: string,
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn();
  } catch (error: any) {
    testResults.push({
      endpoint,
      method,
      status: 'FAIL',
      message: error.message
    });
  }
}

// Test 1: Health Check
async function testHealthCheck(): Promise<void> {
  console.log('📋 Testing health check...');
  
  const response = await fetch(`${SERVICE_URL}/health`);
  const data = await response.json();
  
  testResults.push({
    endpoint: '/health',
    method: 'GET',
    status: response.ok ? 'PASS' : 'FAIL',
    message: response.ok ? 'Service is healthy' : 'Health check failed',
    responseCode: response.status
  });
  
  if (response.ok) {
    console.log('  ✅ Health check passed');
    console.log(`  📊 Service info:`, data);
  } else {
    console.log('  ❌ Health check failed');
  }
}

// Test 2: Service Discovery
async function testServiceDiscovery(): Promise<void> {
  console.log('\n📋 Testing service info endpoint...');
  
  const response = await fetch(`${SERVICE_URL}/api/v1/info`);
  
  testResults.push({
    endpoint: '/api/v1/info',
    method: 'GET',
    status: response.ok ? 'PASS' : 'FAIL',
    message: response.ok ? 'Service info retrieved' : 'Failed to get service info',
    responseCode: response.status
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('  ✅ Service info retrieved');
    console.log(`  📊 Version: ${data.version || '1.0.0'}`);
  } else {
    console.log('  ❌ Service info endpoint not found (optional)');
  }
}

// Test 3: Authentication - Login
async function testLogin(): Promise<void> {
  console.log('\n📋 Testing authentication...');
  
  // First, try with invalid credentials
  const invalidResponse = await fetch(`${SERVICE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'invalid_user',
      password: 'wrong_password'
    })
  });
  
  if (invalidResponse.status === 401) {
    console.log('  ✅ Invalid login correctly rejected (401)');
  }
  
  // Try with a test/admin user (if exists in database)
  const validResponse = await fetch(`${SERVICE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123' // Common test password
    })
  });
  
  if (validResponse.ok) {
    const data = await validResponse.json();
    authToken = data.token || data.access_token;
    console.log('  ✅ Login successful with test user');
    console.log(`  🔑 Token received: ${authToken ? 'Yes' : 'No'}`);
    
    testResults.push({
      endpoint: '/api/v1/auth/login',
      method: 'POST',
      status: 'PASS',
      message: 'Authentication working',
      responseCode: validResponse.status
    });
  } else {
    console.log('  ⚠️ No test user available (expected for new service)');
    testResults.push({
      endpoint: '/api/v1/auth/login',
      method: 'POST',
      status: 'SKIP',
      message: 'No test user in database yet',
      responseCode: validResponse.status
    });
  }
}

// Test 4: Employee Endpoints
async function testEmployeeEndpoints(): Promise<void> {
  console.log('\n📋 Testing employee endpoints...');
  
  // Test GET /employees (should require auth)
  const unauthResponse = await fetch(`${SERVICE_URL}/api/v1/employees`);
  
  if (unauthResponse.status === 401) {
    console.log('  ✅ Employee list correctly protected (401 without auth)');
    testResults.push({
      endpoint: '/api/v1/employees',
      method: 'GET',
      status: 'PASS',
      message: 'Endpoint correctly protected',
      responseCode: 401
    });
  } else {
    console.log('  ⚠️ Employee endpoint not properly protected');
    testResults.push({
      endpoint: '/api/v1/employees',
      method: 'GET',
      status: 'FAIL',
      message: 'Endpoint should require authentication',
      responseCode: unauthResponse.status
    });
  }
  
  // If we have a token, test with auth
  if (authToken) {
    const authResponse = await fetch(`${SERVICE_URL}/api/v1/employees`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (authResponse.ok) {
      const data = await authResponse.json();
      console.log(`  ✅ Employee list retrieved (${data.length || 0} employees)`);
      testResults.push({
        endpoint: '/api/v1/employees',
        method: 'GET (auth)',
        status: 'PASS',
        message: `Retrieved ${data.length || 0} employees`,
        responseCode: 200
      });
    }
  }
}

// Test 5: Department Endpoints
async function testDepartmentEndpoints(): Promise<void> {
  console.log('\n📋 Testing department endpoints...');
  
  const response = await fetch(`${SERVICE_URL}/api/v1/departments`);
  
  if (response.status === 401) {
    console.log('  ✅ Department endpoint correctly protected');
    testResults.push({
      endpoint: '/api/v1/departments',
      method: 'GET',
      status: 'PASS',
      message: 'Endpoint correctly protected',
      responseCode: 401
    });
  } else if (response.ok) {
    console.log('  ⚠️ Department endpoint accessible without auth');
    testResults.push({
      endpoint: '/api/v1/departments',
      method: 'GET',
      status: 'FAIL',
      message: 'Should require authentication',
      responseCode: response.status
    });
  }
}

// Test 6: Organization Endpoints
async function testOrganizationEndpoints(): Promise<void> {
  console.log('\n📋 Testing organization endpoints...');
  
  const response = await fetch(`${SERVICE_URL}/api/v1/organizations`);
  
  if (response.status === 401) {
    console.log('  ✅ Organization endpoint correctly protected');
    testResults.push({
      endpoint: '/api/v1/organizations',
      method: 'GET',
      status: 'PASS',
      message: 'Endpoint correctly protected',
      responseCode: 401
    });
  } else if (response.ok) {
    console.log('  ⚠️ Organization endpoint accessible without auth');
    testResults.push({
      endpoint: '/api/v1/organizations',
      method: 'GET',
      status: 'FAIL',
      message: 'Should require authentication',
      responseCode: response.status
    });
  }
}

// Test 7: Team Endpoints
async function testTeamEndpoints(): Promise<void> {
  console.log('\n📋 Testing team endpoints...');
  
  const response = await fetch(`${SERVICE_URL}/api/v1/teams`);
  
  if (response.status === 401) {
    console.log('  ✅ Team endpoint correctly protected');
    testResults.push({
      endpoint: '/api/v1/teams',
      method: 'GET',
      status: 'PASS',
      message: 'Endpoint correctly protected',
      responseCode: 401
    });
  } else if (response.ok) {
    console.log('  ⚠️ Team endpoint accessible without auth');
    testResults.push({
      endpoint: '/api/v1/teams',
      method: 'GET',
      status: 'FAIL',
      message: 'Should require authentication',
      responseCode: response.status
    });
  }
}

// Print test results summary
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`📊 Total: ${testResults.length}`);
  
  console.log('\n📋 Detailed Results:');
  console.log('-'.repeat(60));
  
  testResults.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : 
                 result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.method} ${result.endpoint}`);
    console.log(`   Status: ${result.responseCode || 'N/A'} - ${result.message}`);
  });
  
  console.log('='.repeat(60));
}

// Main test runner
async function main() {
  console.log(`
========================================
🧪 Employee Core Service Test Suite
========================================
Target: ${SERVICE_URL}
========================================
`);

  // Check if service is running
  console.log('🔍 Checking if service is running...');
  
  try {
    const response = await fetch(`${SERVICE_URL}/health`);
    if (response.ok) {
      console.log('✅ Service is already running!\n');
      
      // Run all tests
      await testHealthCheck();
      await testServiceDiscovery();
      await testLogin();
      await testEmployeeEndpoints();
      await testDepartmentEndpoints();
      await testOrganizationEndpoints();
      await testTeamEndpoints();
      
      // Print summary
      printSummary();
      
      const failed = testResults.filter(r => r.status === 'FAIL').length;
      if (failed === 0) {
        console.log('\n🎉 All tests passed! Employee Core Service is ready.');
      } else {
        console.log(`\n⚠️ ${failed} test(s) failed. Review the results above.`);
      }
    }
  } catch (error) {
    console.log('❌ Service is not running.');
    console.log('\n📝 To start the service, run:');
    console.log('   cd services/employee-core');
    console.log('   npm run dev');
    console.log('\nOr use the launcher:');
    console.log('   tsx services/launcher.ts');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});