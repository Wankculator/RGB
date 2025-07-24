#!/bin/bash

# Complete BTCPay Setup - Fixed Version

echo "✅ Completing BTCPay Setup..."

# Your configuration
BTCPAY_URL="https://btcpay0.voltageapp.io"
BTCPAY_API_KEY="1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM"
BTCPAY_STORE_ID="HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG"
BTC_ADDRESS="bc1qdsdr3ztdcvuj5kl0j4sh6qpe60579nx0dpgydu"

# Update .env file
echo "📝 Updating configuration..."
cat >> .env << EOF

# BTCPay Server Configuration (Updated)
BTCPAY_URL=$BTCPAY_URL
BTCPAY_API_KEY=$BTCPAY_API_KEY
BTCPAY_STORE_ID=$BTCPAY_STORE_ID
BTCPAY_WEBHOOK_SECRET=$(openssl rand -hex 32)
BTC_WALLET_ADDRESS=$BTC_ADDRESS
USE_BTCPAY=true
USE_VOLTAGE_LIGHTNING=false
USE_MOCK_LIGHTNING=false
EOF

echo "✅ Configuration updated!"
echo ""
echo "🧪 Testing BTCPay connection..."
node scripts/test-btcpay-integration.js

echo ""
echo "🎉 BTCPay Setup Complete!"
echo ""
echo "📋 Your Configuration:"
echo "- BTCPay URL: $BTCPAY_URL"
echo "- Store ID: $BTCPAY_STORE_ID"
echo "- Bitcoin Address: $BTC_ADDRESS"
echo "- API Key: Configured ✅"
echo ""
echo "💰 All payments will go to: $BTC_ADDRESS"
echo ""
echo "🚀 Next Steps:"
echo "1. Update payment service to use BTCPay"
echo "2. Test a payment"
echo "3. Deploy to production"