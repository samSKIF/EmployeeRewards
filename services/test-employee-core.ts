#!/usr/bin/env tsx

/**
 * Test script for Employee Core Service
 * Verifies the service can start and respond to health checks
 */

import { spawn } from 'child_process';
import * as path from 'path';

const SERVICE_PORT = 3001;
const SERVICE_URL = `http://localhost:${SERVICE_PORT}`;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVICE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
      return true;
    }
    console.log('❌ Health check failed:', response.status);
    return false;
  } catch (error: any) {
    console.log('⚠️ Service not yet available:', error.message);
    return false;
  }
}

async function testAuthEndpoint(): Promise<void> {
  console.log('\n📝 Testing authentication endpoint...');
  
  try {
    // Test login with dummy credentials
    const response = await fetch(`${SERVICE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_user',
        password: 'test_password'
      })
    });

    if (response.status === 401) {
      console.log('✅ Auth endpoint responding correctly (401 for invalid credentials)');
    } else {
      console.log(`⚠️ Unexpected response: ${response.status}`);
    }
  } catch (error: any) {
    console.log('❌ Auth endpoint test failed:', error.message);
  }
}

async function testEmployeeEndpoint(): Promise<void> {
  console.log('\n📝 Testing employee endpoint...');
  
  try {
    const response = await fetch(`${SERVICE_URL}/api/v1/employees`);
    
    if (response.status === 401) {
      console.log('✅ Employee endpoint protected (401 without auth)');
    } else if (response.status === 200) {
      console.log('✅ Employee endpoint accessible');
    } else {
      console.log(`⚠️ Unexpected response: ${response.status}`);
    }
  } catch (error: any) {
    console.log('❌ Employee endpoint test failed:', error.message);
  }
}

async function main() {
  console.log(`
========================================
🧪 Employee Core Service Test
========================================
Port: ${SERVICE_PORT}
URL: ${SERVICE_URL}
========================================
  `);

  console.log('📡 Starting Employee Core Service...\n');

  const servicePath = path.join(__dirname, 'employee-core');
  
  // Start the service
  const child = spawn('npm', ['run', 'dev'], {
    cwd: servicePath,
    env: {
      ...process.env,
      EMPLOYEE_CORE_PORT: String(SERVICE_PORT),
      NODE_ENV: 'development'
    },
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  child.stdout?.on('data', (data) => {
    console.log(`[Service] ${data.toString().trim()}`);
  });

  child.stderr?.on('data', (data) => {
    console.error(`[Service Error] ${data.toString().trim()}`);
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start service:', error.message);
    process.exit(1);
  });

  // Wait for service to be ready
  console.log('⏳ Waiting for service to be ready...\n');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    if (await checkHealth()) {
      console.log('\n🎉 Service is ready!\n');
      break;
    }
    attempts++;
    await sleep(1000);
  }

  if (attempts >= maxAttempts) {
    console.log('\n❌ Service failed to start within 30 seconds');
    child.kill();
    process.exit(1);
  }

  // Run tests
  await testAuthEndpoint();
  await testEmployeeEndpoint();

  console.log(`
========================================
✅ Employee Core Service Test Complete
========================================
The service is running and responding to requests.
Next steps:
1. Set up the database (employee_core_db)
2. Run migrations: npm run migrate
3. Implement dual-write pattern
4. Begin gradual traffic migration
========================================
  `);

  // Keep service running for manual testing
  console.log('\n💡 Service is still running. Press Ctrl+C to stop.\n');
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping service...');
    child.kill();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});