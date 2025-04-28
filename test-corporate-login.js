import fetch from 'node-fetch';

// Function to test logging in as corporate admin
async function testCorporateLogin() {
  try {
    console.log('Attempting to login as corporate admin...');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'corp_admin',
        password: 'SecurePassword123!'
      }),
    });
    
    console.log('Response status:', response.status);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('Login successful!');
      const data = await response.json();
      console.log('Token received:', data.token ? `${data.token.substring(0, 20)}...` : 'No token');
      console.log('User data:', data.user);
    } else {
      console.log('Login failed.');
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
testCorporateLogin();