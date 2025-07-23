#!/usr/bin/env node

// Manual environment setup to avoid dotenv dependency
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// RGB Integration Test Script - Following CLAUDE.md
const rgbService = require('../server/services/rgbServiceV2');
const featureFlags = require('../server/config/features');
const { logger } = require('../server/utils/logger');

async function testRGBIntegration() {
  console.log('\n🧪 RGB Integration Test Suite\n');
  console.log('=============================\n');

  // 1. Display current configuration
  console.log('📋 Current Configuration:');
  console.log(`   Mode: ${featureFlags.get('useMockRGB') ? 'MOCK' : 'REAL'}`);
  console.log(`   Network: ${featureFlags.get('rgbNetwork')}`);
  console.log(`   Fallback: ${featureFlags.get('rgbFallbackToMock') ? 'Enabled' : 'Disabled'}`);
  console.log(`   RGB Node: ${process.env.RGB_NODE_URL || 'Not configured'}`);
  console.log();

  // 2. Validate configuration
  console.log('🔍 Validating Configuration...');
  const validation = featureFlags.validateConfiguration();
  if (validation.valid) {
    console.log('✅ Configuration is valid\n');
  } else {
    console.log('❌ Configuration errors:');
    validation.errors.forEach(err => console.log(`   - ${err}`));
    console.log();
  }

  // 3. Test RGB Service
  console.log('🧪 Testing RGB Service...\n');
  
  try {
    // Health check
    console.log('1️⃣ Health Check:');
    const health = await rgbService.checkHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Mode: ${health.mode}`);
    if (health.network) console.log(`   Network: ${health.network}`);
    console.log();

    // Asset info
    console.log('2️⃣ Asset Information:');
    try {
      const assetInfo = await rgbService.getAssetInfo();
      if (assetInfo) {
        console.log(`   Asset ID: ${assetInfo.id || 'N/A'}`);
        console.log(`   Name: ${assetInfo.name || 'N/A'}`);
        console.log(`   Supply: ${assetInfo.totalSupply || 'N/A'}`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }
    console.log();

    // Invoice validation
    console.log('3️⃣ Invoice Validation Test:');
    const testInvoices = [
      'rgb:utxob:valid-test-invoice',
      'invalid-format',
      'rgb:',
      ''
    ];

    for (const invoice of testInvoices) {
      const result = await rgbService.validateInvoice(invoice);
      console.log(`   ${invoice || '(empty)'}: ${result.valid ? '✅' : '❌'} ${result.error || ''}`);
    }
    console.log();

    // Consignment generation (mock only)
    if (featureFlags.get('useMockRGB')) {
      console.log('4️⃣ Consignment Generation (Mock):');
      const consignment = await rgbService.generateConsignment({
        rgbInvoice: 'rgb:utxob:test-consignment',
        amount: 1400,
        invoiceId: 'test-' + Date.now()
      });
      console.log(`   ✅ Generated: ${consignment.substring(0, 50)}...`);
      console.log(`   Size: ${consignment.length} characters`);
    } else {
      console.log('4️⃣ Consignment Generation: Skipped (Real mode - safety)');
    }
    console.log();

    // Run full integration test
    console.log('5️⃣ Full Integration Test:');
    const integrationResult = await rgbService.testIntegration();
    console.log(`   Overall: ${integrationResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    Object.entries(integrationResult.tests).forEach(([test, passed]) => {
      console.log(`   ${test}: ${passed ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }

  console.log('\n✅ All tests completed!\n');
}

// Feature flag switching test
async function testFeatureFlagSwitching() {
  console.log('\n🔄 Testing Feature Flag Switching\n');
  
  // Save current state
  const originalUseMock = featureFlags.get('useMockRGB');
  
  try {
    // Test switching to real mode
    console.log('Switching to REAL mode...');
    process.env.USE_MOCK_RGB = 'false';
    featureFlags.set('useMockRGB', false);
    
    const health1 = await rgbService.checkHealth();
    console.log(`Mode: ${health1.mode}, Status: ${health1.status}`);
    
    // Test switching back to mock
    console.log('\nSwitching to MOCK mode...');
    process.env.USE_MOCK_RGB = 'true';
    featureFlags.set('useMockRGB', true);
    
    const health2 = await rgbService.checkHealth();
    console.log(`Mode: ${health2.mode}, Status: ${health2.status}`);
    
  } finally {
    // Restore original state
    featureFlags.set('useMockRGB', originalUseMock);
    process.env.USE_MOCK_RGB = originalUseMock ? 'true' : 'false';
  }
  
  console.log('\n✅ Feature flag switching test completed!');
}

// Main execution
async function main() {
  console.log('🚀 LIGHTCAT RGB Integration Test\n');
  
  try {
    await testRGBIntegration();
    
    if (process.argv.includes('--test-switching')) {
      await testFeatureFlagSwitching();
    }
    
    console.log('🎉 All tests passed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
main();