# ⚡ LIGHTCAT Quick Resume Checklist

## 🎯 Where You Are Now:
- ✅ Supabase database fully configured
- ✅ Voltage Lightning node created 
- 🚧 Channel opening (wait ~30 min)
- ❌ Need to download Voltage credentials
- ❌ Need to install RGB and create tokens

## 📋 Immediate TODOs:

### 1️⃣ Download Voltage Credentials (5 min)
```bash
# Create folder
mkdir -p ~/voltage-credentials

# Go to https://voltage.cloud dashboard
# Download these files to ~/voltage-credentials/:
- admin.macaroon
- tls.cert
```

### 2️⃣ Update .env File (2 min)
```bash
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website
nano .env

# Change line 12-13 to your actual paths:
LIGHTNING_MACAROON_PATH=/home/YOUR_USERNAME/voltage-credentials/admin.macaroon
LIGHTNING_TLS_CERT_PATH=/home/YOUR_USERNAME/voltage-credentials/tls.cert
```

### 3️⃣ Test Lightning Connection (1 min)
```bash
node scripts/test-voltage-connection.js
# Should show "Connected to Voltage Lightning Node!"
```

### 4️⃣ Install RGB While Channel Opens (20 min)
```bash
# Option A: Quick install
./scripts/setup-lightweight-testnet.sh

# Option B: Manual install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
cargo install rgb-node
```

### 5️⃣ Create RGB Wallet & Tokens (10 min)
```bash
# Start RGB
rgbd --network testnet &

# Create wallet
rgb-cli wallet create lightcat-testnet

# Issue tokens
rgb-cli asset issue \
  --ticker LCAT \
  --name LIGHTCAT \
  --supply 21000000 \
  --precision 0 \
  --wallet lightcat-testnet

# SAVE THE ASSET ID! (looks like: rgb:xxxx-xxxx-xxxx)
```

### 6️⃣ Final Configuration (5 min)
```bash
# Add to .env:
RGB_ASSET_ID=rgb:YOUR-ACTUAL-ASSET-ID-HERE

# Generate JWT secret:
JWT_SECRET=$(openssl rand -base64 32)
```

### 7️⃣ Test Everything! (5 min)
```bash
# Restart servers
npm run dev

# Run full test
node scripts/full-user-simulation.js
```

## 🔍 Quick Status Checks:

```bash
# Check Lightning channel status
curl -X GET https://lightcat.m.voltageapp.io:8080/v1/channels \
  -H "Grpc-Metadata-macaroon: $(xxd -p -c 1000 ~/voltage-credentials/admin.macaroon)" \
  --cacert ~/voltage-credentials/tls.cert | grep active

# Check RGB
rgb-cli wallet balance lightcat-testnet

# Check servers
curl http://localhost:8082  # Frontend
curl http://localhost:3000/health  # API
```

## ⏱️ Time Estimate:
- **Active work**: 45 minutes
- **Waiting**: 30 minutes (channel confirmation)
- **Total**: ~1.5 hours to full testnet

## 🚨 If You Get Stuck:
1. Channel not opening? Check https://mempool.space/testnet
2. RGB install fails? Use Docker: `docker run -it rgbtools/rgb-node`
3. Can't download credentials? Check Voltage dashboard notifications
4. API errors? Make sure .env paths are absolute, not relative

## 🎉 Success Looks Like:
- ✅ Lightning channel shows "Active: 1"
- ✅ RGB wallet shows 21,000,000 LCAT balance
- ✅ Test creates real Lightning invoices
- ✅ Payments actually work (testnet)

---
**Remember**: Everything in `AI_HANDOFF_COMPLETE_STATUS.md` for full details!