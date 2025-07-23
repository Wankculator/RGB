#!/bin/bash

# LIGHTCAT Lightning Network Setup Script
# Supports LND, Core Lightning, and hosted solutions

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}⚡ LIGHTCAT Lightning Network Setup${NC}"
echo "======================================"
echo ""

# Function to select Lightning implementation
select_lightning_implementation() {
    echo -e "${BLUE}Select Lightning Implementation:${NC}"
    echo "1) LND (Lightning Network Daemon)"
    echo "2) Core Lightning (CLN)"
    echo "3) Voltage Cloud (Hosted)"
    echo "4) Alby Hub (Hosted)"
    echo "5) BTCPay Server (Self-hosted)"
    echo ""
    read -p "Enter choice [1-5]: " ln_choice
    
    case $ln_choice in
        1) setup_lnd ;;
        2) setup_cln ;;
        3) setup_voltage ;;
        4) setup_alby ;;
        5) setup_btcpay ;;
        *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
    esac
}

# Function to setup LND
setup_lnd() {
    echo -e "${BLUE}⚡ Setting up LND...${NC}"
    
    # Check if LND is installed
    if ! command -v lnd &> /dev/null; then
        echo "Installing LND..."
        cd /tmp
        wget https://github.com/lightningnetwork/lnd/releases/download/v0.17.3-beta/lnd-linux-amd64-v0.17.3-beta.tar.gz
        tar -xzf lnd-linux-amd64-v0.17.3-beta.tar.gz
        sudo mv lnd-linux-amd64-v0.17.3-beta/lnd /usr/local/bin/
        sudo mv lnd-linux-amd64-v0.17.3-beta/lncli /usr/local/bin/
        rm -rf lnd-linux-amd64*
    fi
    
    # Create LND directory
    mkdir -p ~/.lnd
    
    # Generate LND config
    cat > ~/.lnd/lnd.conf << EOF
[Application Options]
alias=LIGHTCAT-NODE
color=#FFFF00
debuglevel=info
maxpendingchannels=10
listen=0.0.0.0:9735
rpclisten=0.0.0.0:10009
restlisten=0.0.0.0:8080

[Bitcoin]
bitcoin.active=true
bitcoin.mainnet=true
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpcuser=YOUR_BITCOIN_RPC_USER
bitcoind.rpcpass=YOUR_BITCOIN_RPC_PASS
bitcoind.rpchost=localhost:8332
bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332
bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333

[protocol]
protocol.wumbo-channels=true

[wtclient]
wtclient.active=true

[routerrpc]
routerrpc.apriori.hopprob=0.5
routerrpc.apriori.weight=0.75
routerrpc.apriori.penaltyhalflife=6h0m0s
routerrpc.apriori.updatetime=1h0m0s

[invoices]
invoices.holdexpirydelta=3600
EOF

    # Create systemd service
    sudo tee /etc/systemd/system/lnd.service > /dev/null << EOF
[Unit]
Description=LND Lightning Network
Requires=bitcoind.service
After=bitcoind.service

[Service]
Type=simple
ExecStart=/usr/local/bin/lnd
User=$USER
Restart=on-failure
RestartSec=30
TimeoutStopSec=300

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}✅ LND configured${NC}"
    echo ""
    echo "Next steps for LND:"
    echo "1. Edit ~/.lnd/lnd.conf with your Bitcoin RPC credentials"
    echo "2. Start LND: sudo systemctl start lnd"
    echo "3. Create wallet: lncli create"
    echo "4. Get macaroon path: ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon"
    echo ""
    
    # Save config for .env
    cat > ~/lightcat-lightning-config.txt << EOF
LIGHTNING_IMPLEMENTATION=LND
LIGHTNING_NODE_URL=https://localhost:8080
LIGHTNING_MACAROON_PATH=$HOME/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
LIGHTNING_TLS_CERT_PATH=$HOME/.lnd/tls.cert
EOF
}

# Function to setup Core Lightning
setup_cln() {
    echo -e "${BLUE}⚡ Setting up Core Lightning...${NC}"
    
    # Install Core Lightning
    if ! command -v lightningd &> /dev/null; then
        echo "Installing Core Lightning..."
        sudo apt update
        sudo apt install -y snapd
        sudo snap install core
        sudo snap install lightning
    fi
    
    # Create CLN directory
    mkdir -p ~/.lightning
    
    # Generate CLN config
    cat > ~/.lightning/config << EOF
network=bitcoin
alias=LIGHTCAT-CLN
rgb=FFFF00
log-level=info
log-file=~/.lightning/lightning.log

# Bitcoin backend
bitcoin-rpcuser=YOUR_BITCOIN_RPC_USER
bitcoin-rpcpassword=YOUR_BITCOIN_RPC_PASS
bitcoin-rpcconnect=127.0.0.1
bitcoin-rpcport=8332

# Lightning options
large-channels
experimental-offers
experimental-dual-fund

# Plugin directory
plugin-dir=~/.lightning/plugins
EOF

    echo -e "${GREEN}✅ Core Lightning configured${NC}"
    echo ""
    echo "Next steps for CLN:"
    echo "1. Edit ~/.lightning/config with your Bitcoin RPC credentials"
    echo "2. Start CLN: lightningd --daemon"
    echo "3. Check status: lightning-cli getinfo"
    echo ""
    
    # Save config for .env
    cat > ~/lightcat-lightning-config.txt << EOF
LIGHTNING_IMPLEMENTATION=CLN
LIGHTNING_NODE_URL=unix://~/.lightning/lightning-rpc
LIGHTNING_CONFIG_PATH=$HOME/.lightning/config
EOF
}

# Function to setup Voltage Cloud
setup_voltage() {
    echo -e "${BLUE}⚡ Setting up Voltage Cloud...${NC}"
    echo ""
    echo "Steps for Voltage Cloud:"
    echo ""
    echo "1. Sign up at https://voltage.cloud"
    echo "2. Create a new Lightning Node"
    echo "3. Choose node type (recommend: Standard LND)"
    echo "4. Download the connection files:"
    echo "   - admin.macaroon"
    echo "   - tls.cert"
    echo "   - Connection string"
    echo ""
    echo "5. Place files in a secure directory:"
    echo "   mkdir -p ~/voltage-credentials"
    echo "   # Copy admin.macaroon and tls.cert there"
    echo ""
    echo "Example .env configuration:"
    echo ""
    cat << EOF
LIGHTNING_IMPLEMENTATION=LND
LIGHTNING_NODE_URL=https://YOUR-NODE.m.voltageapp.io:8080
LIGHTNING_MACAROON_PATH=~/voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=~/voltage-credentials/tls.cert
EOF
    echo ""
}

# Function to setup Alby Hub
setup_alby() {
    echo -e "${BLUE}⚡ Setting up Alby Hub...${NC}"
    echo ""
    echo "Steps for Alby Hub:"
    echo ""
    echo "1. Install Alby browser extension"
    echo "2. Create account at https://getalby.com"
    echo "3. Go to Alby Hub dashboard"
    echo "4. Generate API credentials"
    echo ""
    echo "5. Get your connection details:"
    echo "   - API endpoint"
    echo "   - Access token"
    echo ""
    echo "Example .env configuration:"
    echo ""
    cat << EOF
LIGHTNING_IMPLEMENTATION=ALBY
LIGHTNING_NODE_URL=https://api.getalby.com
LIGHTNING_API_KEY=YOUR_ALBY_API_KEY
EOF
    echo ""
}

# Function to setup BTCPay Server
setup_btcpay() {
    echo -e "${BLUE}⚡ Setting up BTCPay Server...${NC}"
    echo ""
    echo "BTCPay Server Installation:"
    echo ""
    echo "1. Follow official guide: https://docs.btcpayserver.org/Deployment/"
    echo ""
    echo "2. Quick install (Docker):"
    echo "   git clone https://github.com/btcpayserver/btcpayserver-docker"
    echo "   cd btcpayserver-docker"
    echo "   ./btcpay-setup.sh -i"
    echo ""
    echo "3. After installation:"
    echo "   - Access BTCPay at https://your-domain"
    echo "   - Create store"
    echo "   - Enable Lightning"
    echo "   - Generate API key"
    echo ""
    echo "Example .env configuration:"
    echo ""
    cat << EOF
LIGHTNING_IMPLEMENTATION=BTCPAY
BTCPAY_URL=https://your-btcpay-domain.com
BTCPAY_STORE_ID=YOUR_STORE_ID
BTCPAY_API_KEY=YOUR_API_KEY
EOF
    echo ""
}

# Function to create Lightning service wrapper
create_lightning_service() {
    echo -e "${BLUE}🔧 Creating Lightning Service Wrapper...${NC}"
    
    cat > ~/litecat-website/server/services/lightningServiceWrapper.js << 'EOF'
const LndService = require('./lndService');
const ClnService = require('./clnService');
const VoltageService = require('./voltageService');
const AlbyService = require('./albyService');
const BtcPayService = require('./btcpayService');

class LightningServiceWrapper {
    constructor() {
        const implementation = process.env.LIGHTNING_IMPLEMENTATION;
        
        switch(implementation) {
            case 'LND':
                this.service = new LndService();
                break;
            case 'CLN':
                this.service = new ClnService();
                break;
            case 'VOLTAGE':
                this.service = new VoltageService();
                break;
            case 'ALBY':
                this.service = new AlbyService();
                break;
            case 'BTCPAY':
                this.service = new BtcPayService();
                break;
            default:
                throw new Error(`Unknown Lightning implementation: ${implementation}`);
        }
    }
    
    async createInvoice(amount, memo) {
        return this.service.createInvoice(amount, memo);
    }
    
    async checkPayment(paymentHash) {
        return this.service.checkPayment(paymentHash);
    }
    
    async getInfo() {
        return this.service.getInfo();
    }
}

module.exports = LightningServiceWrapper;
EOF

    echo -e "${GREEN}✅ Lightning service wrapper created${NC}"
}

# Function to test Lightning connection
test_lightning_connection() {
    echo -e "${BLUE}🧪 Testing Lightning Connection...${NC}"
    
    cat > ~/test-lightning.js << 'EOF'
require('dotenv').config();
const LightningService = require('./server/services/lightningServiceWrapper');

async function test() {
    try {
        const lightning = new LightningService();
        
        console.log('Testing Lightning connection...');
        const info = await lightning.getInfo();
        console.log('✅ Connected successfully!');
        console.log('Node info:', info);
        
        console.log('\nCreating test invoice...');
        const invoice = await lightning.createInvoice(1000, 'LIGHTCAT test');
        console.log('✅ Invoice created:', invoice.payment_request);
        
    } catch (error) {
        console.error('❌ Lightning test failed:', error.message);
    }
}

test();
EOF

    echo -e "${GREEN}✅ Test script created${NC}"
    echo "Run test with: node ~/test-lightning.js"
}

# Main menu
main() {
    select_lightning_implementation
    create_lightning_service
    test_lightning_connection
    
    echo ""
    echo -e "${GREEN}🎉 Lightning setup complete!${NC}"
    echo ""
    echo "Don't forget to:"
    echo "1. Update your .env file with Lightning credentials"
    echo "2. Test the connection"
    echo "3. Open channels for receiving payments"
    echo "4. Set up payment webhooks (if supported)"
}

# Run main function
main