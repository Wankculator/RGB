#!/bin/bash

# Enable FULL MOCK MODE for safe testing

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🔒 Enabling Full Mock Mode for Safe Testing"
echo "==========================================="
echo ""

# Create remote script
cat > /tmp/enable-mock-remote.sh << 'MOCKSCRIPT'
#!/bin/bash

cd /var/www/rgblightcat

echo "📝 Updating .env for full mock mode..."

# Backup current .env
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)

# Update to full mock mode
cat > .env << 'ENVFILE'
NODE_ENV=development
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Supabase (keep real for testing)
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDk2MzksImV4cCI6MjA2ODY4NTYzOX0.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

# BTCPay (keep config but use mock)
BTCPAY_URL=https://btcpay0.voltageapp.io
BTCPAY_API_KEY=1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM
BTCPAY_STORE_ID=HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG
BTC_WALLET_ADDRESS=bc1qdsdr3ztdcvuj5kl0j4sh6qpe60579nx0dpgydu

# MOCK EVERYTHING FOR TESTING
USE_MOCK_RGB=true
USE_MOCK_LIGHTNING=true
USE_BTCPAY=false
RGB_FALLBACK_TO_MOCK=true

# RGB Mock Config
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
MOCK_RGB_BALANCE=21000000

# Feature Flags - SAFE MODE
ENABLE_TEST_ENDPOINTS=true
ENABLE_RATE_LIMITING=true
ENABLE_DEBUG_LOGGING=true
ACCEPT_REAL_PAYMENTS=false

# Security
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
ENVFILE

echo "✅ Mock mode enabled!"
echo ""
echo "🔄 Restarting services..."
pm2 restart all

echo ""
echo "📊 Current configuration:"
echo "- RGB: MOCK MODE ✅"
echo "- Lightning: MOCK MODE ✅"
echo "- Payments: TEST ONLY ✅"
echo "- Real money: DISABLED ✅"
echo ""
echo "🧪 Safe for testing!"

MOCKSCRIPT

# Upload and run
echo "📤 Applying mock configuration..."
scp /tmp/enable-mock-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/enable-mock-remote.sh && bash /tmp/enable-mock-remote.sh'

echo ""
echo "✅ Full mock mode enabled!"
echo ""
echo "🧪 You can now safely test:"
echo "- Game mechanics"
echo "- Payment flow (fake)"
echo "- Token distribution (mock)"
echo "- Full user experience"
echo ""
echo "❌ NO REAL MONEY will be accepted!"
echo "❌ NO REAL TOKENS will be distributed!"
echo ""
echo "Visit: https://rgblightcat.com (when DNS updates)"