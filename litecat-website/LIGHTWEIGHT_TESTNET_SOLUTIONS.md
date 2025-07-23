# 🚀 Lightweight Testnet Solutions (No 50GB Required!)

## ✅ Option 1: Bitcoin Core PRUNED Mode (Only 2-5GB)

Instead of full blockchain, use pruned mode:

```bash
# In bitcoin.conf add:
prune=5000  # Only keeps last 5GB of blocks
```

This reduces storage from 50GB to just 5GB!

## ✅ Option 2: Neutrino Light Client (< 100MB)

LND can run without Bitcoin Core using Neutrino:

```bash
# Create light LND config
cat > ~/.lnd/lnd.conf << EOF
[Bitcoin]
bitcoin.active=true
bitcoin.testnet=true
bitcoin.node=neutrino

[Neutrino]
neutrino.connect=testnet1-btcd.zaphq.io
neutrino.connect=testnet2-btcd.zaphq.io
EOF

# Start LND directly - NO Bitcoin Core needed!
lnd
```

**Storage: < 100MB** ✅
**Sync time: 5-10 minutes** ✅

## ✅ Option 3: RGB Protocol Public Infrastructure

RGB Protocol provides test infrastructure:

### 1. RGB Testnet Explorer
- https://testnet.rgb.tech
- View assets and transfers
- No local node needed!

### 2. RGB Public Nodes (Community Run)
You can connect to public RGB nodes instead of running your own:

```bash
# Configure to use remote RGB node
export RGB_NODE_URL=https://testnet.rgbnode.com  # Example
```

### 3. Iris Wallet (RGB Wallet with Built-in Node)
- Download: https://github.com/RGB-Tools/iris-wallet-android
- Has testnet support
- Manages RGB without local node

## ✅ Option 4: Voltage Cloud + RGB Only

**Most Practical Solution:**

1. **Use Voltage for Lightning** (FREE)
   ```bash
   # Sign up at https://voltage.cloud
   # Create testnet LND node
   # Get macaroon + connection details
   # NO DOWNLOAD REQUIRED!
   ```

2. **Run ONLY RGB locally** (< 1GB)
   ```bash
   # Just RGB, no Bitcoin Core
   cargo install rgb-node
   rgbd --network testnet --data-dir ~/.rgb-testnet
   ```

3. **Connect them in .env**:
   ```env
   # Lightning from Voltage
   LIGHTNING_NODE_URL=https://your-node.m.voltageapp.io:8080
   LIGHTNING_MACAROON_PATH=./voltage-credentials/admin.macaroon
   
   # RGB local (lightweight)
   RGB_NODE_URL=http://localhost:50001
   ```

## ✅ Option 5: Blockstream Esplora API (No Node!)

Use Blockstream's API instead of running Bitcoin:

```javascript
// In your code, use Esplora API
const ESPLORA_URL = 'https://blockstream.info/testnet/api';

// Get UTXO info without running node
async function getUTXO(address) {
    const response = await fetch(`${ESPLORA_URL}/address/${address}/utxo`);
    return response.json();
}
```

## 🎯 Recommended Setup (Minimal Resources)

### Total Storage: < 2GB
### Setup Time: 30 minutes

```bash
# 1. Install only RGB (no Bitcoin Core)
git clone https://github.com/RGB-WG/rgb-node
cd rgb-node
cargo build --release
sudo mv target/release/rgbd /usr/local/bin/

# 2. Use Voltage for Lightning
# Sign up at voltage.cloud
# Create testnet node (free tier)

# 3. Configure your app
cat > .env << EOF
# Use Voltage Lightning
LIGHTNING_IMPLEMENTATION=VOLTAGE
LIGHTNING_NODE_URL=https://your-voltage-node.com:8080
LIGHTNING_MACAROON=your-voltage-macaroon

# Local RGB only
RGB_NODE_URL=http://localhost:50001
RGB_NETWORK=testnet

# Use Esplora for blockchain data
BITCOIN_EXPLORER_API=https://blockstream.info/testnet/api
EOF

# 4. Start only RGB daemon
rgbd --network testnet
```

## 🔧 Modified Setup Script for Lightweight

Create this lightweight setup:

```bash
#!/bin/bash
# Lightweight RGB + Voltage Setup

echo "🚀 Lightweight LIGHTCAT Setup"

# 1. Install RGB only
echo "Installing RGB Node..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install rgb-node

# 2. Configure RGB
mkdir -p ~/.rgb-testnet
echo "✅ RGB installed"

# 3. Get Voltage credentials
echo "📱 Please sign up at https://voltage.cloud"
echo "Create a testnet node and download credentials"
read -p "Press Enter when ready..."

# 4. Start RGB
rgbd --network testnet --data-dir ~/.rgb-testnet &
echo "✅ RGB running"

echo "🎉 Setup complete! No blockchain download needed!"
```

## 📊 Comparison

| Solution | Storage | Sync Time | Complexity |
|----------|---------|-----------|------------|
| Full Node | 50GB+ | 24 hours | High |
| Pruned Node | 5GB | 12 hours | Medium |
| Neutrino | 100MB | 10 min | Low |
| Voltage + RGB | 1GB | 30 min | Low |
| API Only | 0GB | Instant | Lowest |

## 🎉 Best Solution for You

**Use Voltage Cloud + Local RGB:**
- ✅ No blockchain download
- ✅ Free Lightning testnet node
- ✅ Only run lightweight RGB
- ✅ Total size < 1GB
- ✅ Setup in 30 minutes

Want me to create the lightweight setup script for you?