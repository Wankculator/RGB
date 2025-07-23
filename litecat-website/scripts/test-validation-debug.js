#!/usr/bin/env node

// Debug validation issues
const http = require('http');

async function testValidation(testCase) {
  return new Promise((resolve) => {
    const data = JSON.stringify(testCase.data);
    
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/rgb/invoice',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = JSON.parse(body);
        console.log(`\nTest: ${testCase.name}`);
        console.log(`Input: ${JSON.stringify(testCase.data)}`);
        console.log(`Expected status: ${testCase.expectedStatus}`);
        console.log(`Actual status: ${res.statusCode}`);
        console.log(`Response: ${JSON.stringify(result)}`);
        
        if (res.statusCode === testCase.expectedStatus) {
          console.log('✅ PASS');
        } else {
          console.log('❌ FAIL');
        }
        
        resolve();
      });
    });
    
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Validation Debug Tests\n');
  
  const tests = [
    {
      name: 'Zero batches should fail',
      data: { rgbInvoice: 'rgb:utxob:zero', batchCount: 0, tier: 'bronze' },
      expectedStatus: 400
    },
    {
      name: 'Negative batches should fail',
      data: { rgbInvoice: 'rgb:utxob:negative', batchCount: -1, tier: 'bronze' },
      expectedStatus: 400
    },
    {
      name: 'Bronze tier exceed (6 batches)',
      data: { rgbInvoice: 'rgb:utxob:bronze-exceed', batchCount: 6, tier: 'bronze' },
      expectedStatus: 400
    },
    {
      name: 'Bronze tier max (5 batches)',
      data: { rgbInvoice: 'rgb:utxob:bronze-max', batchCount: 5, tier: 'bronze' },
      expectedStatus: 200
    },
    {
      name: 'String batch count "5"',
      data: { rgbInvoice: 'rgb:utxob:string-batch', batchCount: "5", tier: 'bronze' },
      expectedStatus: 200
    },
    {
      name: 'String batch count "0"',
      data: { rgbInvoice: 'rgb:utxob:string-zero', batchCount: "0", tier: 'bronze' },
      expectedStatus: 400
    }
  ];
  
  for (const test of tests) {
    await testValidation(test);
  }
  
  console.log('\nDone!');
}

main();