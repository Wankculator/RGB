const https = require('https');

// BTCPay credentials
const BTCPAY_URL = 'https://btcpay0.voltageapp.io';
const API_KEY = '1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM';
const STORE_ID = 'HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG';

console.log('🔍 BTCPay Server Detailed Test\n');
console.log('Server:', BTCPAY_URL);
console.log('Store ID:', STORE_ID);
console.log('API Key:', API_KEY);
console.log('\n-------------------\n');

// Test 1: Check API key info
async function testAPIKey() {
  console.log('1. Testing API Key validity...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'btcpay0.voltageapp.io',
      port: 443,
      path: '/api/v1/api-keys/current',
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        if (res.statusCode === 200) {
          const keyInfo = JSON.parse(data);
          console.log('   ✅ API Key is valid!');
          console.log('   Permissions:', keyInfo.permissions || 'N/A');
        } else {
          console.log('   ❌ API Key invalid or expired');
          console.log('   Response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('   ❌ Connection error:', err.message);
      resolve();
    });
    
    req.end();
  });
}

// Test 2: List stores
async function testListStores() {
  console.log('\n2. Testing store access...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'btcpay0.voltageapp.io',
      port: 443,
      path: '/api/v1/stores',
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        if (res.statusCode === 200) {
          const stores = JSON.parse(data);
          console.log('   ✅ Can access stores!');
          console.log('   Number of stores:', stores.length);
          stores.forEach(store => {
            console.log(`   - ${store.name} (${store.id})`);
          });
        } else {
          console.log('   ❌ Cannot access stores');
          console.log('   Response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('   ❌ Error:', err.message);
      resolve();
    });
    
    req.end();
  });
}

// Test 3: Get specific store
async function testGetStore() {
  console.log('\n3. Testing specific store access...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'btcpay0.voltageapp.io',
      port: 443,
      path: `/api/v1/stores/${STORE_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        if (res.statusCode === 200) {
          const store = JSON.parse(data);
          console.log('   ✅ Store access confirmed!');
          console.log('   Store name:', store.name);
          console.log('   Default currency:', store.defaultCurrency);
        } else if (res.statusCode === 403) {
          console.log('   ❌ No permission to access this store');
        } else if (res.statusCode === 404) {
          console.log('   ❌ Store not found with this ID');
        } else {
          console.log('   ❌ Error accessing store');
          console.log('   Response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('   ❌ Error:', err.message);
      resolve();
    });
    
    req.end();
  });
}

// Test 4: Create test invoice
async function testCreateInvoice() {
  console.log('\n4. Testing invoice creation...');
  
  const invoiceData = {
    amount: '1000',
    currency: 'SATS',
    metadata: {
      orderId: 'test_' + Date.now(),
      itemDesc: 'Test LIGHTCAT purchase'
    }
  };
  
  return new Promise((resolve) => {
    const postData = JSON.stringify(invoiceData);
    
    const options = {
      hostname: 'btcpay0.voltageapp.io',
      port: 443,
      path: `/api/v1/stores/${STORE_ID}/invoices`,
      method: 'POST',
      headers: {
        'Authorization': `token ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const invoice = JSON.parse(data);
          console.log('   ✅ Invoice created successfully!');
          console.log('   Invoice ID:', invoice.id);
          console.log('   Amount:', invoice.amount, 'sats');
          console.log('   Checkout URL:', invoice.checkoutLink);
        } else {
          console.log('   ❌ Failed to create invoice');
          console.log('   Response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log('   ❌ Error:', err.message);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

// Run all tests
async function runTests() {
  await testAPIKey();
  await testListStores();
  await testGetStore();
  await testCreateInvoice();
  
  console.log('\n-------------------');
  console.log('✅ Test complete!\n');
}

runTests();