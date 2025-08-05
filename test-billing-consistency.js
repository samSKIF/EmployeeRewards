#!/usr/bin/env node

// Comprehensive billing consistency test script
import https from 'https';
import http from 'http';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: res.statusCode === 200 ? JSON.parse(data) : data,
            headers: res.headers
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runConsistencyTest() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🔍 BILLING CONSISTENCY TEST');
  console.log('=' .repeat(50));
  
  // 1. Get regular admin token
  console.log('1. Getting regular admin token...');
  const loginRes = await makeRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@canva.com', password: 'password' })
  });
  
  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes.data);
    return;
  }
  
  const token1 = loginRes.data.token;
  console.log('✅ Regular token obtained');
  
  // 2. Get management token
  console.log('2. Getting management admin token...');
  const mgmtLoginRes = await makeRequest(`${baseUrl}/api/management/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@canva.com', password: 'password' })
  });
  
  if (mgmtLoginRes.status !== 200) {
    console.error('❌ Management login failed:', mgmtLoginRes.data);
    return;
  }
  
  const token2 = mgmtLoginRes.data.token;
  console.log('✅ Management token obtained');
  
  // 3. Test subscription usage endpoint
  console.log('3. Testing subscription usage endpoint...');
  const subRes = await makeRequest(`${baseUrl}/api/admin/subscription/usage`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  
  console.log('📊 Subscription Usage Results:');
  console.log(`   Status: ${subRes.status}`);
  if (subRes.status === 200) {
    console.log(`   Billable Users: ${subRes.data.billable_users}`);
    console.log(`   Current Usage: ${subRes.data.current_usage}`);
    console.log(`   Organization: ${subRes.data.organization_name || 'N/A'}`);
  } else {
    console.log(`   Error: ${subRes.data}`);
  }
  
  // 4. Test management analytics endpoint
  console.log('4. Testing management analytics endpoint...');
  const analyticsRes = await makeRequest(`${baseUrl}/api/management/analytics`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  
  console.log('📊 Management Analytics Results:');
  console.log(`   Status: ${analyticsRes.status}`);
  if (analyticsRes.status === 200) {
    console.log(`   Current Employees: ${analyticsRes.data.organizationStats?.currentEmployees}`);
    console.log(`   Total Billable Users: ${analyticsRes.data.organizationStats?.totalBillableUsers}`);
    console.log(`   Total Organizations: ${analyticsRes.data.organizationStats?.totalOrganizations}`);
  } else {
    console.log(`   Error: ${analyticsRes.data}`);
  }
  
  // 5. Compare results
  console.log('5. CONSISTENCY ANALYSIS:');
  console.log('=' .repeat(50));
  
  if (subRes.status === 200 && analyticsRes.status === 200) {
    const subUsers = subRes.data.billable_users;
    const mgmtUsers = analyticsRes.data.organizationStats?.currentEmployees;
    
    console.log(`Subscription Usage (Org-scoped): ${subUsers}`);
    console.log(`Management Analytics (Platform-wide): ${mgmtUsers}`);
    
    if (subUsers === mgmtUsers) {
      console.log('✅ CONSISTENT: Both endpoints return the same count');
    } else {
      console.log('⚠️  INCONSISTENT: Different counts detected');
      console.log(`   Difference: ${Math.abs(mgmtUsers - subUsers)} users`);
      console.log('   📝 Expected: Management shows platform-wide, Subscription shows org-scoped');
    }
  } else {
    console.log('❌ Cannot compare - one or both endpoints failed');
  }
  
  console.log('\n🎯 FRONTEND FIX NEEDED:');
  console.log('   "Current Users" field should use management analytics data');
  console.log('   Value should be: organizationStats.currentEmployees');
}

// Run the test
runConsistencyTest().catch(console.error);