import fetch from 'node-fetch';

// Function to create a corporate admin account
async function createCorporateAdmin() {
  try {
    console.log('Attempting to create corporate admin account...');
    
    const response = await fetch('http://localhost:5000/api/admin/corporate-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'corp.admin@thriviohr.com',
        password: 'SecurePassword123!',
        name: 'Corporate Admin',
        username: 'corp_admin'
      }),
    });
    
    console.log('Response status:', response.status);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('Corporate admin created successfully!');
      try {
        const data = await response.json();
        console.log('User data:', data);
      } catch (parseError) {
        console.log('Could not parse response as JSON');
        const text = await response.text();
        console.log('Response text:', text.substring(0, 100));
      }
    } else {
      console.log('Failed to create corporate admin.');
      try {
        const errorData = await response.json();
        console.log('Error data:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response as JSON');
        const text = await response.text();
        console.log('Response text:', text.substring(0, 100));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the function
createCorporateAdmin();