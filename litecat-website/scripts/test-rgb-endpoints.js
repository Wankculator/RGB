#!/usr/bin/env node

// RGB Endpoints Integration Test
const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

// Test runner
async function runTest(testName, testFn) {
  try {
    console.log(`\n${colors.cyan}Testing: ${testName}${colors.reset}`);
    const result = await testFn();
    if (result.success) {
      console.log(`${colors.green}✅ PASSED${colors.reset}: ${result.message}`);
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}: ${result.message}`);
    }
    return result.success;
  } catch (error) {
    console.log(`${colors.red}❌ ERROR${colors.reset}: ${error.message}`);
    return false;
  }
}

// Test cases
async function testHealthCheck() {
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
  });
  
  return {
    success: response.status === 200 && response.data.status === 'ok',
    message: `Health check returned: ${response.data.status || 'no status'}`
  };
}

async function testRGBStats() {
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/rgb/stats',
    method: 'GET'
  });
  
  return {
    success: response.status === 200 && response.data.success,
    message: `Stats: ${response.data.totalSold || 0} tokens sold`
  };
}

async function testCreateInvoice() {
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/rgb/invoice',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    rgbInvoice: 'rgb:utxob:test-' + Date.now(),
    batchCount: 2,
    tier: 'silver'
  });
  
  if (response.status === 200 && response.data.success) {
    // Store invoice ID for next test
    global.testInvoiceId = response.data.invoiceId;
    return {
      success: true,
      message: `Created invoice: ${response.data.invoiceId} for ${response.data.amount} sats`
    };
  }
  
  return {
    success: false,
    message: `Failed to create invoice: ${response.data.error || 'Unknown error'}`
  };
}

async function testInvoiceStatus() {
  if (!global.testInvoiceId) {
    return { success: false, message: 'No invoice ID from previous test' };
  }
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/rgb/invoice/${global.testInvoiceId}/status`,
    method: 'GET'
  });
  
  return {
    success: response.status === 200 && response.data.success,
    message: `Invoice status: ${response.data.status}, consignment: ${response.data.consignment ? 'generated' : 'not generated'}`
  };
}

async function testInvalidInvoice() {
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/rgb/invoice',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    rgbInvoice: 'invalid-format',
    batchCount: 1,
    tier: 'bronze'
  });
  
  return {
    success: response.status === 400,
    message: `Invalid invoice correctly rejected: ${response.data.error || 'No error message'}`
  };
}

async function testBatchLimits() {
  const tests = [
    { tier: 'bronze', batches: 6, shouldFail: true },   // Exceeds bronze limit (5)
    { tier: 'silver', batches: 9, shouldFail: true },   // Exceeds silver limit (8)
    { tier: 'gold', batches: 11, shouldFail: true },    // Exceeds gold limit (10)
    { tier: 'gold', batches: 10, shouldFail: false }    // Within gold limit
  ];
  
  for (const test of tests) {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/rgb/invoice',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      rgbInvoice: 'rgb:utxob:limit-test-' + Date.now(),
      batchCount: test.batches,
      tier: test.tier
    });
    
    const failed = response.status !== 200;
    if (failed === test.shouldFail) {
      console.log(`  ${colors.green}✓${colors.reset} ${test.tier} tier with ${test.batches} batches: ${test.shouldFail ? 'correctly rejected' : 'correctly accepted'}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${test.tier} tier with ${test.batches} batches: ${test.shouldFail ? 'should have been rejected' : 'should have been accepted'}`);
      return { success: false, message: 'Batch limit validation failed' };
    }
  }
  
  return { success: true, message: 'All batch limit tests passed' };
}

async function testRecentPurchases() {
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/rgb/recent-purchases',
    method: 'GET'
  });
  
  return {
    success: response.status === 200 && Array.isArray(response.data),
    message: `Retrieved ${response.data.length || 0} recent purchases`
  };
}

// Main test runner
async function main() {
  console.log(`\n${colors.blue}🧪 RGB Endpoints Integration Test${colors.reset}`);
  console.log(`${colors.blue}==================================${colors.reset}`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'RGB Stats', fn: testRGBStats },
    { name: 'Create Invoice', fn: testCreateInvoice },
    { name: 'Invoice Status', fn: testInvoiceStatus },
    { name: 'Invalid Invoice Format', fn: testInvalidInvoice },
    { name: 'Batch Limits Validation', fn: testBatchLimits },
    { name: 'Recent Purchases', fn: testRecentPurchases }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    if (result) passed++;
    else failed++;
  }
  
  // Summary
  console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}✅ All tests passed! RGB integration is working correctly.${colors.reset}\n`);
    
    // Next steps
    console.log(`${colors.yellow}Next Steps:${colors.reset}`);
    console.log('1. Test the UI flow by visiting http://localhost:8082');
    console.log('2. Play the game to unlock a tier');
    console.log('3. Enter an RGB invoice in format: rgb:utxob:your-invoice-here');
    console.log('4. Complete a mock purchase');
    console.log('5. When ready, switch to real RGB by setting USE_MOCK_RGB=false\n');
  } else {
    console.log(`\n${colors.red}❌ Some tests failed. Please check the implementation.${colors.reset}\n`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
main().catch(console.error);