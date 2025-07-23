#!/usr/bin/env node

// Standalone RGB Integration Test - No Dependencies
const fs = require('fs');
const path = require('path');

// Manual env loading
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

console.log('\n🧪 RGB Integration Test Suite (Standalone)\n');
console.log('==========================================\n');

// Display current configuration
console.log('📋 Current Configuration:');
console.log(`   Mode: ${process.env.USE_MOCK_RGB === 'true' ? 'MOCK' : 'REAL'}`);
console.log(`   Network: ${process.env.RGB_NETWORK || 'testnet'}`);
console.log(`   Fallback: ${process.env.RGB_FALLBACK_TO_MOCK === 'true' ? 'Enabled' : 'Disabled'}`);
console.log(`   RGB Node: ${process.env.RGB_NODE_URL || 'Not configured'}`);
console.log(`   Asset ID: ${process.env.RGB_ASSET_ID || 'Not configured'}`);
console.log();

// Test feature flags
console.log('🚩 Feature Flags:');
console.log(`   Mock RGB: ${process.env.USE_MOCK_RGB}`);
console.log(`   Mock Lightning: ${process.env.USE_MOCK_LIGHTNING}`);
console.log(`   Test Endpoints: ${process.env.ENABLE_TEST_ENDPOINTS}`);
console.log(`   Debug Logging: ${process.env.ENABLE_DEBUG_LOGGING}`);
console.log();

// Test RGB service configuration
console.log('🔧 RGB Service Configuration:');
const rgbServicePath = path.join(__dirname, '..', 'server', 'services', 'rgbServiceV2.js');
if (fs.existsSync(rgbServicePath)) {
  console.log('   ✅ rgbServiceV2.js exists');
  
  // Check for mock implementation
  const mockRgbPath = path.join(__dirname, '..', 'server', 'services', 'mockRgbImplementation.js');
  if (fs.existsSync(mockRgbPath)) {
    console.log('   ✅ mockRgbImplementation.js exists');
  } else {
    console.log('   ❌ mockRgbImplementation.js missing');
  }
} else {
  console.log('   ❌ rgbServiceV2.js missing');
}
console.log();

// Test Lightning configuration
console.log('⚡ Lightning Configuration:');
console.log(`   Implementation: ${process.env.LIGHTNING_IMPLEMENTATION || 'Not set'}`);
console.log(`   Node URL: ${process.env.LIGHTNING_NODE_URL || 'Not configured'}`);
console.log(`   API Endpoint: ${process.env.LIGHTNING_API_ENDPOINT || 'Not configured'}`);
console.log();

// Test validation
console.log('🔍 Configuration Validation:');

const errors = [];

// Check for production issues
if (process.env.NODE_ENV === 'production') {
  if (process.env.ENABLE_TEST_ENDPOINTS === 'true') {
    errors.push('Test endpoints enabled in production');
  }
  if (process.env.ENABLE_DEBUG_LOGGING === 'true') {
    errors.push('Debug logging enabled in production');
  }
  if (process.env.USE_MOCK_RGB === 'true' && process.env.RGB_NETWORK === 'mainnet') {
    errors.push('Mock RGB enabled for mainnet');
  }
}

// Check network consistency
if (process.env.RGB_NETWORK !== process.env.LIGHTNING_NETWORK && 
    process.env.RGB_NETWORK && process.env.LIGHTNING_NETWORK) {
  errors.push(`Network mismatch: RGB on ${process.env.RGB_NETWORK}, Lightning on ${process.env.LIGHTNING_NETWORK}`);
}

if (errors.length > 0) {
  console.log('   ❌ Configuration errors:');
  errors.forEach(err => console.log(`      - ${err}`));
} else {
  console.log('   ✅ Configuration is valid');
}
console.log();

// Simulate RGB operations
console.log('🧪 Simulating RGB Operations:');

// 1. Invoice validation
console.log('\n1️⃣ Invoice Validation:');
const testInvoices = [
  'rgb:utxob:valid-test-invoice',
  'invalid-format',
  'rgb:',
  ''
];

testInvoices.forEach(invoice => {
  const isValid = invoice.startsWith('rgb:') && invoice.length > 4;
  console.log(`   ${invoice || '(empty)'}: ${isValid ? '✅' : '❌'}`);
});

// 2. Mock consignment generation
if (process.env.USE_MOCK_RGB === 'true') {
  console.log('\n2️⃣ Mock Consignment Generation:');
  const mockConsignment = Buffer.from('RGB_MOCK_CONSIGNMENT_' + Date.now()).toString('base64');
  console.log(`   ✅ Generated: ${mockConsignment.substring(0, 30)}...`);
  console.log(`   Size: ${mockConsignment.length} characters`);
} else {
  console.log('\n2️⃣ Consignment Generation: Skipped (Real mode)');
}

// Summary
console.log('\n📊 Test Summary:');
console.log(`   Mode: ${process.env.USE_MOCK_RGB === 'true' ? 'MOCK' : 'REAL'}`);
console.log(`   Configuration: ${errors.length === 0 ? '✅ Valid' : '❌ Has errors'}`);
console.log(`   Ready for testing: ${process.env.USE_MOCK_RGB === 'true' ? '✅ Yes' : '⚠️  Real mode - proceed with caution'}`);
console.log();

// Next steps
console.log('📝 Next Steps:');
if (process.env.USE_MOCK_RGB === 'true') {
  console.log('   1. Server is configured for MOCK mode - safe for testing');
  console.log('   2. Start the server with: npm run server');
  console.log('   3. Test RGB invoice flow in the UI');
  console.log('   4. When ready, set USE_MOCK_RGB=false for real RGB integration');
} else {
  console.log('   1. Server is configured for REAL mode');
  console.log('   2. Ensure RGB node is running at:', process.env.RGB_NODE_URL);
  console.log('   3. Verify Lightning node connection');
  console.log('   4. Test with small amounts first');
}
console.log();

console.log('✅ RGB integration configuration test completed!\n');