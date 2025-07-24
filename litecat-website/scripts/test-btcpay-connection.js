const https = require('https');
require('dotenv').config();

// Test BTCPay Server connection
async function testBTCPayConnection() {
  console.log('🔌 Testing BTCPay Server Connection...\n');
  
  const btcpayUrl = process.env.BTCPAY_URL;
  const apiKey = process.env.BTCPAY_API_KEY;
  const storeId = process.env.BTCPAY_STORE_ID;
  
  console.log('Configuration:');
  console.log('- URL:', btcpayUrl);
  console.log('- Store ID:', storeId);
  console.log('- API Key:', apiKey ? '✓ Set' : '✗ Missing');
  console.log('');
  
  if (!btcpayUrl || !apiKey || !storeId) {
    console.error('❌ Missing required configuration!');
    return;
  }
  
  // Test API connection
  console.log('Testing API connection...');
  
  try {
    const url = new URL(`${btcpayUrl}/api/v1/stores/${storeId}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, data: JSON.parse(data) });
          } else {
            resolve({ success: false, status: res.statusCode, data });
          }
        });
      });
      
      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      
      req.end();
    });
    
    if (result.success) {
      console.log('✅ Connection successful!');
      console.log('Store Name:', result.data.name);
      console.log('Store ID:', result.data.id);
      console.log('Default Currency:', result.data.defaultCurrency);
      
      // Test creating a test invoice
      console.log('\nTesting invoice creation...');
      
      const invoiceData = {
        amount: '1000',
        currency: 'SATS',
        metadata: {
          orderId: 'test_' + Date.now(),
          itemDesc: 'Test LIGHTCAT purchase'
        }
      };
      
      const invoiceUrl = new URL(`${btcpayUrl}/api/v1/stores/${storeId}/invoices`);
      
      const invoiceOptions = {
        hostname: invoiceUrl.hostname,
        port: invoiceUrl.port || 443,
        path: invoiceUrl.pathname,
        method: 'POST',
        headers: {
          'Authorization': `token ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(invoiceData))
        }
      };
      
      const invoiceResult = await new Promise((resolve, reject) => {
        const req = https.request(invoiceOptions, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, data: JSON.parse(data) });
            } else {
              resolve({ success: false, status: res.statusCode, data });
            }
          });
        });
        
        req.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
        
        req.write(JSON.stringify(invoiceData));
        req.end();
      });
      
      if (invoiceResult.success) {
        console.log('✅ Invoice created successfully!');
        console.log('Invoice ID:', invoiceResult.data.id);
        console.log('Checkout URL:', invoiceResult.data.checkoutLink);
        console.log('Amount:', invoiceResult.data.amount, 'sats');
        console.log('Status:', invoiceResult.data.status);
      } else {
        console.log('❌ Invoice creation failed!');
        console.log('Status:', invoiceResult.status);
        console.log('Error:', invoiceResult.data);
      }
      
    } else {
      console.log('❌ Connection failed!');
      console.log('Status:', result.status);
      console.log('Error:', result.error || result.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBTCPayConnection();