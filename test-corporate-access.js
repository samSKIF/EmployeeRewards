import fetch from 'node-fetch';

// Function to test corporate admin access to admin routes
async function testCorporateAccess() {
  // First, login to get a token
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: process.env.CORP_ADMIN_USERNAME || 'corp_admin',
      password: process.env.CORP_ADMIN_PASSWORD || 'please_set_environment_variable'
    }),
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  console.log('Logged in as corporate admin, got token:', token.substring(0, 20) + '...');
  
  // Test routes that require admin access
  const routesToTest = [
    '/api/users',  // List all users
    '/api/admin/employees', // List all employees
    '/api/hr/branding', // Get branding settings
    '/api/shop/config', // Get shop configuration
  ];
  
  console.log('\nTesting admin routes with corporate admin token...\n');
  
  for (const route of routesToTest) {
    try {
      console.log(`Testing route: ${route}`);
      const response = await fetch(`http://localhost:5000${route}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status >= 200 && response.status < 300) {
        console.log('  Access granted ✓');
        // For brevity, don't print the full response data
        // const data = await response.json();
        // console.log('  Response data:', data);
      } else {
        console.log('  Access denied ✗');
        try {
          const errorData = await response.json();
          console.log('  Error:', errorData);
        } catch (e) {
          const text = await response.text();
          console.log('  Error text:', text.substring(0, 100));
        }
      }
    } catch (error) {
      console.error(`  Error testing ${route}:`, error.message);
    }
    console.log(''); // Add empty line for readability
  }
}

// Run the function
testCorporateAccess();