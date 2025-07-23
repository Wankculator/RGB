#!/usr/bin/env node

// Lightning Network Integration Test
const fs = require('fs');
const path = require('path');

// Load environment manually
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

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`${colors.magenta}⚡ Lightning Network Integration Test${colors.reset}`);
console.log(`${colors.magenta}=====================================\n${colors.reset}`);

// 1. Check Lightning Configuration
console.log(`${colors.cyan}1. Lightning Configuration:${colors.reset}`);
console.log(`   Implementation: ${process.env.LIGHTNING_IMPLEMENTATION || 'Not set'}`);
console.log(`   Node URL: ${process.env.LIGHTNING_NODE_URL || 'Not configured'}`);
console.log(`   Node Pubkey: ${process.env.LIGHTNING_NODE_PUBKEY ? process.env.LIGHTNING_NODE_PUBKEY.substring(0, 20) + '...' : 'Not set'}`);
console.log(`   API Endpoint: ${process.env.LIGHTNING_API_ENDPOINT || 'Not configured'}`);
console.log(`   Mock Mode: ${process.env.USE_MOCK_LIGHTNING === 'true' ? 'ENABLED' : 'DISABLED'}`);

// 2. Check Macaroon and Certificate Paths
console.log(`\n${colors.cyan}2. Authentication Files:${colors.reset}`);
const macaroonPath = process.env.LIGHTNING_MACAROON_PATH;
const tlsCertPath = process.env.LIGHTNING_TLS_CERT_PATH;

if (macaroonPath) {
  const exists = fs.existsSync(macaroonPath);
  console.log(`   Macaroon: ${exists ? colors.green + '✅ Found' : colors.red + '❌ Missing'} ${colors.reset}at ${macaroonPath}`);
} else {
  console.log(`   Macaroon: ${colors.yellow}⚠️  Path not configured${colors.reset}`);
}

if (tlsCertPath) {
  const exists = fs.existsSync(tlsCertPath);
  console.log(`   TLS Cert: ${exists ? colors.green + '✅ Found' : colors.red + '❌ Missing'} ${colors.reset}at ${tlsCertPath}`);
} else {
  console.log(`   TLS Cert: ${colors.yellow}⚠️  Path not configured${colors.reset}`);
}

// 3. Test Lightning Service
console.log(`\n${colors.cyan}3. Lightning Service Tests:${colors.reset}`);

// Check if service file exists
const lightningServicePath = path.join(__dirname, '..', 'server', 'services', 'lightningService.js');
if (fs.existsSync(lightningServicePath)) {
  console.log(`   ${colors.green}✅${colors.reset} Lightning service file exists`);
  
  // Try to load it
  try {
    const LightningService = require(lightningServicePath);
    console.log(`   ${colors.green}✅${colors.reset} Lightning service loads successfully`);
    
    // Check if it's in mock mode
    if (process.env.USE_MOCK_LIGHTNING === 'true') {
      console.log(`   ${colors.yellow}⚠️${colors.reset} Running in MOCK mode - safe for testing`);
    } else {
      console.log(`   ${colors.blue}ℹ️${colors.reset} Running in REAL mode - requires Lightning node`);
    }
  } catch (error) {
    console.log(`   ${colors.red}❌${colors.reset} Failed to load service: ${error.message}`);
  }
} else {
  console.log(`   ${colors.red}❌${colors.reset} Lightning service file not found`);
}

// 4. Test Lightning Invoice Creation Flow
console.log(`\n${colors.cyan}4. Lightning Invoice Flow Test:${colors.reset}`);

const http = require('http');

async function testInvoiceCreation() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      rgbInvoice: 'rgb:utxob:lightning-test-' + Date.now(),
      batchCount: 2,
      tier: 'bronze'
    });
    
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
        if (result.success && result.lightningInvoice) {
          console.log(`   ${colors.green}✅${colors.reset} Lightning invoice created successfully`);
          console.log(`   Invoice: ${result.lightningInvoice.substring(0, 30)}...`);
          console.log(`   Amount: ${result.amount} satoshis`);
          console.log(`   Expires: ${new Date(result.expiresAt).toLocaleTimeString()}`);
          
          // Decode the invoice
          if (result.lightningInvoice.startsWith('lnbc')) {
            console.log(`   ${colors.green}✅${colors.reset} Valid Lightning invoice format (mainnet)`);
          } else if (result.lightningInvoice.startsWith('lntb')) {
            console.log(`   ${colors.green}✅${colors.reset} Valid Lightning invoice format (testnet)`);
          } else {
            console.log(`   ${colors.yellow}⚠️${colors.reset} Mock Lightning invoice format`);
          }
        } else {
          console.log(`   ${colors.red}❌${colors.reset} Failed to create invoice: ${result.error}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ${colors.red}❌${colors.reset} Request failed: ${error.message}`);
      resolve();
    });
    
    req.write(data);
    req.end();
  });
}

// 5. Check Voltage Integration
console.log(`\n${colors.cyan}5. Voltage Lightning Node:${colors.reset}`);
const voltageUrl = process.env.LIGHTNING_NODE_URL;
if (voltageUrl && voltageUrl.includes('voltageapp.io')) {
  console.log(`   ${colors.green}✅${colors.reset} Voltage node configured`);
  console.log(`   URL: ${voltageUrl}`);
  
  // Check if we can reach it (in real mode)
  if (process.env.USE_MOCK_LIGHTNING !== 'true') {
    console.log(`   ${colors.yellow}⚠️${colors.reset} Real node connection test skipped (requires credentials)`);
  }
} else {
  console.log(`   ${colors.yellow}⚠️${colors.reset} No Voltage node configured`);
}

// 6. Payment Webhook Configuration
console.log(`\n${colors.cyan}6. Payment Webhook:${colors.reset}`);
const webhookPath = '/api/webhooks/lightning';
console.log(`   Webhook endpoint: http://localhost:3000${webhookPath}`);
console.log(`   ${colors.blue}ℹ️${colors.reset} This endpoint receives payment notifications`);

// Run the tests
async function runTests() {
  await testInvoiceCreation();
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Summary:${colors.reset}`);
  
  const isMockMode = process.env.USE_MOCK_LIGHTNING === 'true';
  if (isMockMode) {
    console.log(`\n${colors.green}✅ Lightning integration is configured for MOCK mode${colors.reset}`);
    console.log(`   - Safe for testing without real Lightning node`);
    console.log(`   - Payments auto-complete after ~3 seconds`);
    console.log(`   - No real Bitcoin involved`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Lightning integration is configured for REAL mode${colors.reset}`);
    console.log(`   - Requires active Lightning node`);
    console.log(`   - Requires valid macaroon and TLS cert`);
    console.log(`   - Will process real Bitcoin payments`);
  }
  
  console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
  if (isMockMode) {
    console.log('1. Test the full payment flow in the UI');
    console.log('2. Verify mock payments auto-complete');
    console.log('3. When ready, set USE_MOCK_LIGHTNING=false');
    console.log('4. Configure real Lightning node credentials');
  } else {
    console.log('1. Ensure Lightning node is running');
    console.log('2. Verify macaroon and TLS cert are valid');
    console.log('3. Test with small amounts first');
    console.log('4. Monitor node logs for issues');
  }
  
  console.log(`\n${colors.green}✅ Lightning integration test completed${colors.reset}\n`);
}

runTests().catch(console.error);