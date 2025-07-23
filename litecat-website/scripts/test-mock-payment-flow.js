#!/usr/bin/env node

// Quick test for mock payment flow
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testMockPaymentFlow() {
  console.log('Testing Mock Payment Flow...\n');

  // Step 1: Create invoice
  console.log('1. Creating invoice...');
  const invoiceRes = await makeRequest('http://localhost:3000/api/rgb/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rgbInvoice: 'rgb:utxob:test-mock-payment',
      batchCount: 1,
      tier: 'bronze'
    })
  });

  if (invoiceRes.status !== 200) {
    console.error('Failed to create invoice:', invoiceRes.data);
    return;
  }

  const { invoiceId, lightningInvoice, amount } = invoiceRes.data;
  console.log(`   ✓ Invoice created: ${invoiceId}`);
  console.log(`   ✓ Lightning invoice: ${lightningInvoice.substring(0, 20)}...`);
  console.log(`   ✓ Amount: ${amount} sats`);

  // Step 2: Check initial status
  console.log('\n2. Checking initial status...');
  const status1 = await makeRequest(`http://localhost:3000/api/rgb/invoice/${invoiceId}/status`);
  console.log(`   Status: ${status1.data.status}`);
  console.log(`   Consignment: ${status1.data.consignment ? 'Present' : 'Not yet'}`);

  // Step 3: Wait for mock payment
  console.log('\n3. Waiting 3 seconds for mock payment...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 4: Check status again
  console.log('\n4. Checking status after wait...');
  const status2 = await makeRequest(`http://localhost:3000/api/rgb/invoice/${invoiceId}/status`);
  console.log(`   Status: ${status2.data.status}`);
  console.log(`   Consignment: ${status2.data.consignment ? 'Present' : 'Not yet'}`);

  if (status2.data.consignment) {
    console.log(`   Consignment preview: ${status2.data.consignment.substring(0, 50)}...`);
  }

  // Step 5: Check multiple times
  console.log('\n5. Polling status every 2 seconds (5 times)...');
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const status = await makeRequest(`http://localhost:3000/api/rgb/invoice/${invoiceId}/status`);
    console.log(`   Poll ${i+1}: Status = ${status.data.status}, Consignment = ${status.data.consignment ? 'YES' : 'NO'}`);
    
    if (status.data.status === 'paid' || status.data.status === 'delivered') {
      console.log('\n✅ Payment completed successfully!');
      return;
    }
  }

  console.log('\n❌ Payment did not complete within timeout');
}

testMockPaymentFlow().catch(console.error);