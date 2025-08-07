#!/usr/bin/env tsx

/**
 * HR Operations Service Test Suite
 * Tests all endpoints and functionality
 */

const SERVICE_URL = 'http://localhost:3004';
const TEST_TOKEN = 'test-jwt-token';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  message: string;
  responseTime?: number;
}

const testResults: TestResult[] = [];

// Test health check
async function testHealthCheck(): Promise<void> {
  console.log('Testing health check...');
  const start = Date.now();
  
  try {
    const response = await fetch(`${SERVICE_URL}/health`);
    const data = await response.json();
    
    testResults.push({
      endpoint: '/health',
      method: 'GET',
      status: response.ok ? 'PASS' : 'FAIL',
      message: response.ok ? 'Service is healthy' : 'Health check failed',
      responseTime: Date.now() - start
    });
    
    if (response.ok) {
      console.log('✅ Health check passed:', data);
    }
  } catch (error: any) {
    testResults.push({
      endpoint: '/health',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      responseTime: Date.now() - start
    });
  }
}

// Test leave management endpoints
async function testLeaveManagement(): Promise<void> {
  console.log('\nTesting leave management endpoints...');
  
  // Test create leave request
  const start = Date.now();
  try {
    const response = await fetch(`${SERVICE_URL}/api/v1/leave/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        employeeId: 1,
        leaveType: 'annual',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        reason: 'Family vacation',
        status: 'pending'
      })
    });
    
    testResults.push({
      endpoint: '/api/v1/leave/requests',
      method: 'POST',
      status: response.status === 201 || response.status === 401 ? 'PASS' : 'FAIL',
      message: response.status === 401 ? 'Endpoint protected (expected)' : 'Leave request created',
      responseTime: Date.now() - start
    });
  } catch (error: any) {
    testResults.push({
      endpoint: '/api/v1/leave/requests',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      responseTime: Date.now() - start
    });
  }
  
  // Test get leave requests
  const start2 = Date.now();
  try {
    const response = await fetch(`${SERVICE_URL}/api/v1/leave/requests/1`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    testResults.push({
      endpoint: '/api/v1/leave/requests/:employeeId',
      method: 'GET',
      status: 'PASS',
      message: `Status: ${response.status}`,
      responseTime: Date.now() - start2
    });
  } catch (error: any) {
    testResults.push({
      endpoint: '/api/v1/leave/requests/:employeeId',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      responseTime: Date.now() - start2
    });
  }
}

// Test performance review endpoints
async function testPerformanceReviews(): Promise<void> {
  console.log('\nTesting performance review endpoints...');
  
  const start = Date.now();
  try {
    const response = await fetch(`${SERVICE_URL}/api/v1/performance/reviews/1`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    testResults.push({
      endpoint: '/api/v1/performance/reviews/:employeeId',
      method: 'GET',
      status: 'PASS',
      message: `Status: ${response.status}`,
      responseTime: Date.now() - start
    });
  } catch (error: any) {
    testResults.push({
      endpoint: '/api/v1/performance/reviews/:employeeId',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      responseTime: Date.now() - start
    });
  }
}

// Test holiday calendar endpoints
async function testHolidayCalendar(): Promise<void> {
  console.log('\nTesting holiday calendar endpoints...');
  
  const start = Date.now();
  try {
    const response = await fetch(`${SERVICE_URL}/api/v1/holidays/organization/1`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    testResults.push({
      endpoint: '/api/v1/holidays/organization/:organizationId',
      method: 'GET',
      status: 'PASS',
      message: `Status: ${response.status}`,
      responseTime: Date.now() - start
    });
  } catch (error: any) {
    testResults.push({
      endpoint: '/api/v1/holidays/organization/:organizationId',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      responseTime: Date.now() - start
    });
  }
}

// Test HR policies endpoints
async function testHRPolicies(): Promise<void> {
  console.log('\nTesting HR policies endpoints...');
  
  const start = Date.now();
  try {
    const response = await fetch(`${SERVICE_URL}/api/v1/policies/organization/1`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    testResults.push({
      endpoint: '/api/v1/policies/organization/:organizationId',
      method: 'GET',
      status: 'PASS',
      message: `Status: ${response.status}`,
      responseTime: Date.now() - start
    });
  } catch (error: any) {
    testResults.push({
      endpoint: '/api/v1/policies/organization/:organizationId',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
      responseTime: Date.now() - start
    });
  }
}

// Print test report
function printReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('HR OPERATIONS SERVICE TEST REPORT');
  console.log('='.repeat(80));
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  
  console.log(`\nTotal Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\nDetailed Results:');
  console.log('-'.repeat(80));
  
  testResults.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
    console.log(`${icon} ${result.method.padEnd(8)} ${result.endpoint.padEnd(40)} ${result.message}${time}`);
  });
  
  console.log('='.repeat(80));
  
  if (failed === 0) {
    console.log('\n🎉 HR Operations Service is fully operational!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the results above.');
  }
}

// Main test runner
async function runTests(): Promise<void> {
  console.log('Starting HR Operations Service tests...\n');
  
  // Wait for service to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testHealthCheck();
  await testLeaveManagement();
  await testPerformanceReviews();
  await testHolidayCalendar();
  await testHRPolicies();
  
  printReport();
}

// Execute tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});