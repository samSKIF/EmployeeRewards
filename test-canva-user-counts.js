#!/usr/bin/env node

// Test script to check Canva user counts across all three locations
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

async function testCanvaUserCounts() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🔍 CANVA USER COUNT CONSISTENCY TEST');
  console.log('=' .repeat(60));
  
  // 1. Get Canva admin token for org-scoped endpoints
  console.log('1. Getting Canva admin token...');
  const loginRes = await makeRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@canva.com', password: 'password' })
  });
  
  if (loginRes.status !== 200) {
    console.error('❌ Canva admin login failed:', loginRes.data);
    return;
  }
  
  const canvaToken = loginRes.data.token;
  console.log('✅ Canva admin token obtained');
  
  // 2. Get corporate admin token for management endpoints
  console.log('2. Getting corporate admin token...');
  const corpLoginRes = await makeRequest(`${baseUrl}/api/management/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@canva.com', password: 'password' })
  });
  
  if (corpLoginRes.status !== 200) {
    console.error('❌ Corporate admin login failed:', corpLoginRes.data);
    return;
  }
  
  const corpToken = corpLoginRes.data.token;
  console.log('✅ Corporate admin token obtained');
  
  // 3. TEST LOCATION 1: Employee Directory - Usage Stats
  console.log('\n📊 LOCATION 1: Employee Directory (Usage Stats)');
  const usageRes = await makeRequest(`${baseUrl}/api/admin/usage-stats`, {
    headers: { 'Authorization': `Bearer ${canvaToken}` }
  });
  
  console.log(`   Status: ${usageRes.status}`);
  if (usageRes.status === 200) {
    console.log(`   SQL Pattern: COUNT(CASE WHEN u.status = 'active' THEN 1 END)`);
    console.log(`   Active Employees: ${usageRes.data.activeEmployees}`);
    console.log(`   Billable Users: ${usageRes.data.billableUsers}`);
    console.log(`   Total Employees: ${usageRes.data.totalEmployees}`);
    console.log(`   🎯 MAIN COUNT: ${usageRes.data.billableUsers} (billable_users field)`);
  } else {
    console.log(`   ❌ Error: ${usageRes.data}`);
  }
  
  // 4. TEST LOCATION 2: Corporate Organizations List
  console.log('\n📊 LOCATION 2: Corporate Organizations');
  const orgsRes = await makeRequest(`${baseUrl}/api/management/organizations`, {
    headers: { 'Authorization': `Bearer ${corpToken}` }
  });
  
  console.log(`   Status: ${orgsRes.status}`);
  if (orgsRes.status === 200) {
    // orgsRes.data is directly an array, not wrapped in .organizations
    const canvaOrg = orgsRes.data.find(org => org.name === 'Canva');
    if (canvaOrg) {
      console.log(`   SQL Pattern: COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END)`);
      console.log(`   🎯 MAIN COUNT: ${canvaOrg.userCount} (userCount field)`);
      console.log(`   Max Users: ${canvaOrg.maxUsers}`);
      console.log(`   Status: ${canvaOrg.status}`);
    } else {
      console.log('   ❌ Canva organization not found in list');
    }
  } else {
    console.log(`   ❌ Error: ${orgsRes.data}`);
  }
  
  // 5. TEST LOCATION 3: Subscription Management
  console.log('\n📊 LOCATION 3: Subscription Management');
  const subRes = await makeRequest(`${baseUrl}/api/admin/subscription/usage`, {
    headers: { 'Authorization': `Bearer ${canvaToken}` }
  });
  
  console.log(`   Status: ${subRes.status}`);
  if (subRes.status === 200) {
    console.log(`   SQL Pattern: COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END)`);
    console.log(`   Active Employees: ${subRes.data.active_employees}`);
    console.log(`   Billable Users: ${subRes.data.billable_users}`);
    console.log(`   Total Employees: ${subRes.data.total_employees}`);
    console.log(`   Current Usage: ${subRes.data.current_usage}`);
    console.log(`   🎯 MAIN COUNT: ${subRes.data.billable_users} (billable_users field)`);
  } else {
    console.log(`   ❌ Error: ${subRes.data}`);
  }
  
  // 6. CONSISTENCY ANALYSIS
  console.log('\n🔍 CONSISTENCY ANALYSIS');
  console.log('=' .repeat(60));
  
  const counts = [];
  let location1Count = null, location2Count = null, location3Count = null;
  
  if (usageRes.status === 200) {
    location1Count = usageRes.data.billableUsers;
    counts.push({ location: 'Employee Directory', count: location1Count });
  }
  
  if (orgsRes.status === 200) {
    const canvaOrg = orgsRes.data.find(org => org.name === 'Canva');
    if (canvaOrg) {
      location2Count = canvaOrg.userCount;
      counts.push({ location: 'Corporate Organizations', count: location2Count });
    }
  }
  
  if (subRes.status === 200) {
    location3Count = subRes.data.billable_users;
    counts.push({ location: 'Subscription Management', count: location3Count });
  }
  
  console.log('📋 CANVA USER COUNTS SUMMARY:');
  counts.forEach(({ location, count }) => {
    console.log(`   ${location}: ${count} users`);
  });
  
  // Check consistency
  const allCounts = counts.map(c => c.count);
  const uniqueCounts = [...new Set(allCounts)];
  
  if (uniqueCounts.length === 1) {
    console.log(`\n✅ CONSISTENT: All locations report ${uniqueCounts[0]} users for Canva`);
  } else {
    console.log(`\n❌ INCONSISTENT: Found ${uniqueCounts.length} different counts: ${uniqueCounts.join(', ')}`);
    
    // Detailed differences
    console.log('\n🔍 DETAILED DIFFERENCES:');
    if (location1Count !== location2Count) {
      console.log(`   Employee Directory vs Corporate Orgs: ${location1Count} vs ${location2Count} (diff: ${Math.abs(location1Count - location2Count)})`);
    }
    if (location1Count !== location3Count) {
      console.log(`   Employee Directory vs Subscription: ${location1Count} vs ${location3Count} (diff: ${Math.abs(location1Count - location3Count)})`);
    }
    if (location2Count !== location3Count) {
      console.log(`   Corporate Orgs vs Subscription: ${location2Count} vs ${location3Count} (diff: ${Math.abs(location2Count - location3Count)})`);
    }
  }
  
  console.log('\n🎯 SQL STANDARDIZATION NEEDED:');
  console.log('   All queries should use: COUNT(CASE WHEN status IN (\'active\', \'pending\') THEN 1 END)');
  console.log('   All queries should filter by: WHERE organization_id = $1 for Canva (ID=1)');
}

// Run the test
testCanvaUserCounts().catch(console.error);