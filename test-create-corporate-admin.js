import fetch from 'node-fetch';

async function createCorporateAdmin() {
  const response = await fetch('http://localhost:5000/api/admin/corporate-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'corporate.admin@thriviohr.com',
      password: 'SecurePassword123!',
      name: 'Corporate Admin',
      username: 'corporate_admin'
    }),
  });

  console.log('Response status:', response.status);
  
  try {
    // Try to parse the response as JSON
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
  } catch (error) {
    // If it's not valid JSON, get the text content
    const text = await response.text();
    console.log('Response text:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
  }
}

createCorporateAdmin().catch(error => {
  console.error('Error:', error);
});