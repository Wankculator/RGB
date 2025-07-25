#!/bin/bash

echo "🧪 Setting up RGB Testnet"
echo "========================"

# Update environment for testnet
ENV_FILE="/root/lightcat-api/.env"

if [ -f "$ENV_FILE" ]; then
    # Backup current env
    cp "$ENV_FILE" "${ENV_FILE}.backup"
    
    # Ensure testnet settings
    grep -q "RGB_NETWORK" "$ENV_FILE" || echo "RGB_NETWORK=testnet" >> "$ENV_FILE"
    grep -q "USE_TESTNET" "$ENV_FILE" || echo "USE_TESTNET=true" >> "$ENV_FILE"
    grep -q "BTCPAY_NETWORK" "$ENV_FILE" || echo "BTCPAY_NETWORK=testnet" >> "$ENV_FILE"
    
    # Update existing values
    sed -i 's/RGB_NETWORK=.*/RGB_NETWORK=testnet/' "$ENV_FILE"
    sed -i 's/USE_TESTNET=.*/USE_TESTNET=true/' "$ENV_FILE"
    
    echo "✅ Environment configured for testnet"
else
    echo "⚠️  No .env file found, creating..."
    cat > "$ENV_FILE" << 'ENV'
# Testnet Configuration
NODE_ENV=development
PORT=3000

# RGB Settings
RGB_NETWORK=testnet
USE_TESTNET=true
USE_MOCK_RGB=false
RGB_AUTO_MODE=true

# BTCPay Testnet
BTCPAY_NETWORK=testnet
ENV
fi

echo ""
echo "Testnet configuration complete!"
echo ""
echo "Next steps for REAL testnet:"
echo "1. Install RGB CLI: curl -sSL https://rgb.tech/install.sh | sh"
echo "2. Create testnet wallet: rgb --network testnet wallet create"
echo "3. Get testnet Bitcoin from: https://testnet-faucet.mempool.co/"
echo "4. Issue test tokens: rgb --network testnet issue --ticker TCAT --supply 21000000"
