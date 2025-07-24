#!/usr/bin/env node

/**
 * Test BTCPay Server Integration
 */

const https = require('https');
const { URL } = require('url');

// Load configuration
require('dotenv').config();

const BTCPAY_URL = process.env.BTCPAY_URL;
const BTCPAY_API_KEY = process.env.BTCPAY_API_KEY;
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID;

console.log('🧪 Testing BTCPay Server Integration\n');
console.log('Configuration:');
console.log('- BTCPay URL:', BTCPAY_URL);
console.log('- Store ID:', BTCPAY_STORE_ID);
console.log('- API Key:', BTCPAY_API_KEY ? '✅ Found' : '❌ Missing');
console.log('');

async function testConnection() {
  try {
    console.log('📡 Testing API connection...');
    
    // Test store info endpoint
    const storeInfo = await makeRequest(`/api/v1/stores/${BTCPAY_STORE_ID}`);
    console.log('✅ Connected to BTCPay Server!');
    console.log('- Store Name:', storeInfo.name);
    console.log('- Default Currency:', storeInfo.defaultCurrency);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function testInvoiceCreation() {
  try {
    console.log('💳 Creating test invoice...');
    
    const invoice = await makeRequest(`/api/v1/stores/${BTCPAY_STORE_ID}/invoices`, 'POST', {
      amount: '1000',
      currency: 'SATS',
      metadata: {
        orderId: 'TEST-' + Date.now(),
        test: true
      }
    });
    
    console.log('✅ Invoice created successfully!');
    console.log('- Invoice ID:', invoice.id);
    console.log('- Amount:', invoice.amount, 'sats');
    console.log('- Checkout URL:', invoice.checkoutLink);
    console.log('- Status:', invoice.status);
    console.log('');
    
    // Extract Bitcoin address
    const btcInfo = invoice.cryptoInfo?.find(c => c.paymentMethod === 'BTC');
    if (btcInfo) {
      console.log('📍 Payment will go to:', btcInfo.address);
      console.log('   (Generated from your xpub)');
    }
    
    console.log('\n🎉 BTCPay Server is working correctly!');
    console.log('\n💰 All payments will be automatically sent to addresses');
    console.log('   generated from your extended public key (xpub).');
    console.log('   No manual withdrawals needed!\n');
    
    return invoice;
  } catch (error) {
    console.error('❌ Invoice creation failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return null;
  }
}

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BTCPAY_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `token ${BTCPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${parsed.message || data}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run tests
async function runTests() {
  const connected = await testConnection();
  if (connected) {
    await testInvoiceCreation();
  }
}

runTests();