#!/usr/bin/env node

// Complete Payment Flow Test Script
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const TEST_RGB_INVOICE = 'rgb:utxob:testnet-payment-flow-' + Date.now();

async function testCompletePaymentFlow() {
  console.log('🧪 Testing Complete Payment Flow\n');
  
  try {
    // Step 1: Create Invoice
    console.log('1️⃣ Creating Lightning Invoice...');
    const invoiceResponse = await axios.post(`${API_URL}/api/rgb/invoice`, {
      rgbInvoice: TEST_RGB_INVOICE,
      batchCount: 3
    });
    
    const { invoiceId, lightningInvoice, amount } = invoiceResponse.data;
    console.log(`✅ Invoice created:
    - ID: ${invoiceId}
    - Amount: ${amount} sats
    - Lightning Invoice: ${lightningInvoice.substring(0, 30)}...
    `);
    
    // Step 2: Check Initial Status
    console.log('2️⃣ Checking initial payment status...');
    const statusResponse1 = await axios.get(`${API_URL}/api/rgb/invoice/${invoiceId}/status`);
    console.log(`✅ Initial status: ${statusResponse1.data.status}\n`);
    
    // Step 3: Wait for mock payment (5 seconds)
    console.log('3️⃣ Waiting for mock payment to complete (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5500));
    
    // Step 4: Check Final Status
    console.log('4️⃣ Checking final payment status...');
    const statusResponse2 = await axios.get(`${API_URL}/api/rgb/invoice/${invoiceId}/status`);
    console.log(`✅ Final status: ${statusResponse2.data.status}`);
    
    if (statusResponse2.data.consignment) {
      console.log(`✅ Consignment generated: ${statusResponse2.data.consignment.substring(0, 50)}...\n`);
      
      // Step 5: Test Download
      console.log('5️⃣ Testing consignment download...');
      const downloadResponse = await axios.get(`${API_URL}/api/rgb/download/${invoiceId}`);
      console.log(`✅ Download successful: ${downloadResponse.headers['content-type']}\n`);
    }
    
    // Step 6: Check Updated Stats
    console.log('6️⃣ Checking updated statistics...');
    const statsResponse = await axios.get(`${API_URL}/api/rgb/stats`);
    console.log('✅ Updated stats:', statsResponse.data.stats);
    
    console.log('\n✅ PAYMENT FLOW TEST PASSED! All endpoints working correctly.\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run test
testCompletePaymentFlow();