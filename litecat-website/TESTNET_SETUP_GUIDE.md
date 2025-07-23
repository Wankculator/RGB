# 🚀 LIGHTCAT Testnet Setup Guide

## 📋 What You Need To Do

Since I cannot run system-level commands, here's exactly what YOU need to do to set up testnet:

### Step 1: Run Testnet Setup (30-45 minutes)

```bash
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website
chmod +x scripts/setup-testnet.sh
./scripts/setup-testnet.sh
```

This script will:
- ✅ Install Bitcoin Core (testnet)
- ✅ Install LND (Lightning Network) 
- ✅ Install RGB Node
- ✅ Create all configuration files
- ✅ Set up systemd services

### Step 2: Start Services & Wait for Sync (2-24 hours)

```bash
# Start Bitcoin Core
sudo systemctl start bitcoind-testnet
sudo systemctl enable bitcoind-testnet

# Check sync progress (this takes hours!)
bitcoin-cli -testnet getblockchaininfo | grep "progress"
# Wait until progress shows 0.999+ (nearly 1.0)

# Once synced, start LND
sudo systemctl start lnd-testnet
sudo systemctl enable lnd-testnet

# Start RGB
sudo systemctl start rgb-testnet
sudo systemctl enable rgb-testnet
```

### Step 3: Create Wallets & Get Testnet Bitcoin (15 minutes)

```bash
# Run the wallet setup script
~/lightcat-testnet/setup-wallet.sh
```

When prompted:
1. **Create LND wallet** - Save the seed phrase!
2. **Get your Bitcoin address** - Copy it
3. **Get free testnet Bitcoin**:
   - Go to: https://testnet-faucet.mempool.co/
   - Or: https://bitcoinfaucet.uo1.net/
   - Or: https://coinfaucet.eu/en/btc-testnet/
   - Send 0.01 tBTC to your address

### Step 4: Create Lightning Channels (10 minutes)

```bash
# After receiving testnet Bitcoin, open a channel
lncli --network=testnet openchannel \
  --node_key 03ecef675be448b615e6176424070673ef8284e0fd19d8be062a6cb5b130a0a0d1 \
  --local_amt 1000000  # 0.01 BTC
```

Popular testnet nodes:
- ACINQ: `03ecef675be448b615e6176424070673ef8284e0fd19d8be062a6cb5b130a0a0d1`
- Blockstream: `02f6725f9c1c40333b67faea92fd211c183050f28df32cac3f9d69685fe9665432`

### Step 5: Issue LIGHTCAT Tokens (5 minutes)

The script will prompt you to issue tokens:
```bash
rgb-cli asset issue \
  --ticker "LCAT" \
  --name "LIGHTCAT-TESTNET" \
  --description "LIGHTCAT testnet tokens" \
  --supply 21000000 \
  --precision 0 \
  --wallet lightcat-testnet
```

### Step 6: Update Your .env File

```bash
# Copy testnet configuration
cp ~/lightcat-testnet/.env.testnet .env

# Edit .env and update RGB_ASSET_ID with the generated ID
nano .env
```

### Step 7: Test Everything!

```bash
# Start your application
npm run dev

# In another terminal, run the test
./scripts/testnet-integration-test.sh
```

## ⏱️ Timeline

| Step | Time Required | Automated? |
|------|--------------|------------|
| Install software | 30-45 min | ✅ Yes |
| Sync blockchain | 2-24 hours | ⏳ Wait |
| Create wallets | 5 min | ✅ Yes |
| Get testnet BTC | 5 min | ❌ Manual |
| Open channels | 10 min | ❌ Manual |
| Issue tokens | 5 min | ✅ Yes |
| Configure app | 5 min | ❌ Manual |

**Total Active Time: ~1 hour**
**Total Wait Time: 2-24 hours (blockchain sync)**

## 🚨 Common Issues

### Bitcoin Won't Sync
- Check internet connection
- Try different peers in bitcoin.conf
- Be patient - testnet can be slow

### Can't Get Testnet Bitcoin
- Try multiple faucets
- Join testnet communities
- Ask in Bitcoin/Lightning Discord servers

### LND Won't Start
- Make sure Bitcoin is fully synced first
- Check logs: `journalctl -u lnd-testnet -f`

### RGB Issues
- Ensure you have funded UTXOs
- Sync wallet: `rgb-cli wallet sync lightcat-testnet`

## 💡 What Happens Next?

Once everything is set up:
1. Your app will use REAL Lightning invoices
2. Payments will need REAL testnet Bitcoin
3. RGB consignments will contain REAL tokens
4. You can test with other testnet users!

## 🎯 Success Indicators

You'll know it's working when:
- ✅ `bitcoin-cli -testnet getblockcount` shows current height
- ✅ `lncli --network=testnet getinfo` shows `"synced_to_chain": true`
- ✅ `rgb-cli wallet balance lightcat-testnet` shows 21,000,000 LCAT
- ✅ Your app creates real Lightning invoices
- ✅ Payments actually transfer tokens

---

**Remember**: This is TESTNET - all coins and tokens have no value. Perfect for testing!