const https = require('https');

// Your BTCPay configuration
const BTCPAY_URL = 'https://btcpay0.voltageapp.io';
const BTCPAY_API_KEY = '1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM';
const BTCPAY_STORE_ID = 'HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG';

console.log('🧪 Testing BTCPay Server Connection...\n');

// Test creating an invoice
const data = JSON.stringify({
  amount: '1000',
  currency: 'SATS',
  metadata: {
    orderId: 'TEST-' + Date.now(),
    test: true
  }
});

const options = {
  hostname: 'btcpay0.voltageapp.io',
  port: 443,
  path: `/api/v1/stores/${BTCPAY_STORE_ID}/invoices`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BTCPAY_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const invoice = JSON.parse(responseData);
      console.log('✅ SUCCESS! BTCPay Server is working!\n');
      console.log('📋 Test Invoice Created:');
      console.log('- Invoice ID:', invoice.id);
      console.log('- Amount:', invoice.amount, 'sats');
      console.log('- Checkout URL:', invoice.checkoutLink);
      console.log('- Status:', invoice.status);
      
      const btcPayment = invoice.cryptoInfo?.find(c => c.paymentMethod === 'BTC');
      if (btcPayment) {
        console.log('\n💰 Payment Address:', btcPayment.address);
        console.log('   (This is where the payment would go)');
      }
      
      console.log('\n🎉 Your BTCPay Server is ready to accept payments!');
      console.log('   All payments will go to addresses derived from your wallet.\n');
    } else {
      console.log('❌ Error:', res.statusCode);
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error);
});

req.write(data);
req.end();