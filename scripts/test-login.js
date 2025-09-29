const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testLogin() {
  const testCredentials = [
    { email: 'admin@wheredjsplay.com', password: 'admin123' },
    { email: 'admin@wheredjsplay.com', password: 'password' },
    { email: 'admin@wheredjsplay.com', password: 'admin' },
    { email: 'admin@wheredjsplay.com', password: '123456' },
    { email: 'admin@wheredjsplay.com', password: 'wheredjsplay' },
    { email: 'admin@wheredjsplay.com', password: 'Admin123' },
  ];

  for (const creds of testCredentials) {
    try {
      console.log(`Testing login with ${creds.email} / ${creds.password}...`);
      
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: creds.email,
        password: creds.password
      });

      if (!response.data.error) {
        console.log('✅ Login successful!');
        console.log('Token:', response.data.data.token.substring(0, 20) + '...');
        console.log('User:', response.data.data.user);
        return response.data.data.token;
      } else {
        console.log('❌ Login failed:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
    }
  }
  
  console.log('❌ No valid credentials found');
  return null;
}

testLogin();
