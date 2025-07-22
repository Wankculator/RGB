const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔧 Testing Litecat Configuration...\n');

// Test environment variables
console.log('✅ Environment Variables Loaded:');
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - PORT:', process.env.PORT);
console.log('   - BTC_WALLET_ADDRESS:', process.env.BTC_WALLET_ADDRESS);
console.log('   - SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('   - JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Not set');
console.log('   - ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
console.log('');

// Test Supabase connection
console.log('🔌 Testing Supabase Connection...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testSupabase() {
  try {
    // Test a simple query
    const { data, error } = await supabase
      .from('purchases')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('   ✗ Supabase connection failed:', error.message);
    } else {
      console.log('   ✅ Supabase connection successful!');
    }
  } catch (e) {
    console.log('   ✗ Supabase connection error:', e.message);
  }
}

// Test configuration loading
console.log('\n📋 Testing Configuration Module...');
try {
  const config = require('./config');
  console.log('   ✅ Configuration loaded successfully');
  console.log('   - Bitcoin wallet:', config.bitcoin.walletAddress);
  console.log('   - Token price:', config.token.satoshisPerBatch, 'sats');
  console.log('   - Tokens per batch:', config.token.tokensPerBatch);
  console.log('   - Total supply:', config.token.totalSupply);
} catch (e) {
  console.log('   ✗ Configuration error:', e.message);
}

// Test CoinPayments status
console.log('\n💳 CoinPayments Configuration:');
const coinpaymentsConfigured = 
  process.env.COINPAYMENTS_PUBLIC_KEY !== 'not-configured' && 
  process.env.COINPAYMENTS_PRIVATE_KEY !== 'not-configured';
console.log('   -', coinpaymentsConfigured ? '✓ Configured' : '✗ Not configured (using direct BTC wallet)');

// Run async tests
testSupabase().then(() => {
  console.log('\n✨ Configuration test complete!');
  process.exit(0);
});