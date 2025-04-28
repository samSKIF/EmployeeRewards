import fetch from 'node-fetch';

// Function to test corporate admin organization list
async function testOrganizationsList() {
  // First, login to get a token
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'corp_admin',
      password: 'SecurePassword123!'
    }),
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  console.log('Logged in as corporate admin, got token:', token.substring(0, 20) + '...');
  
  // Now test the organizations endpoint
  console.log('\nTesting the organizations list endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/organizations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('Successfully retrieved organizations list.');
      const organizations = await response.json();
      console.log('Number of organizations:', organizations.length);
      console.log('Organizations:');
      
      if (organizations.length === 0) {
        console.log('No client organizations found.');
        
        // Let's create a test client organization
        console.log('\nCreating a test client organization...');
        const createOrgResponse = await fetch('http://localhost:5000/api/admin/organizations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Client Organization',
            type: 'client',
            status: 'active'
          }),
        });
        
        if (createOrgResponse.status >= 200 && createOrgResponse.status < 300) {
          console.log('Successfully created test client organization.');
          const newOrg = await createOrgResponse.json();
          console.log('New organization:', newOrg);
        } else {
          console.log('Failed to create organization.');
          try {
            const errorData = await createOrgResponse.json();
            console.log('Error:', errorData);
          } catch (e) {
            const text = await createOrgResponse.text();
            console.log('Error text:', text.substring(0, 100));
          }
        }
      } else {
        organizations.forEach((org, index) => {
          console.log(`  [${index + 1}] ${org.name} (${org.type}) - Users: ${org.user_count || 0}`);
        });
      }
    } else {
      console.log('Failed to retrieve organizations.');
      try {
        const errorData = await response.json();
        console.log('Error:', errorData);
      } catch (e) {
        const text = await response.text();
        console.log('Error text:', text.substring(0, 100));
      }
    }
  } catch (error) {
    console.error('Error testing organizations endpoint:', error.message);
  }
}

// Run the function
testOrganizationsList();