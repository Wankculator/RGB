const axios = require('axios');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function testServer() {
  console.log('🧪 Testing server connection...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test stats endpoint
    console.log('\n2. Testing stats endpoint...');
    const statsResponse = await axios.get(`${SERVER_URL}/api/payments/stats`);
    console.log('✅ Stats:', statsResponse.data);
    
    // Test invoice creation
    console.log('\n3. Testing invoice creation...');
    const invoiceResponse = await axios.post(`${SERVER_URL}/api/payments/create-invoice`, {
      walletAddress: 'bc1qtest123456789',
      batchCount: 1,
      gameTier: 1
    });
    console.log('✅ Invoice created:', invoiceResponse.data);
    
    // Test invoice verification
    console.log('\n4. Testing invoice verification...');
    const verifyResponse = await axios.get(`${SERVER_URL}/api/payments/verify/${invoiceResponse.data.invoiceId}`);
    console.log('✅ Verification result:', verifyResponse.data);
    
    console.log('\n🎉 All tests passed! Server is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testServer();