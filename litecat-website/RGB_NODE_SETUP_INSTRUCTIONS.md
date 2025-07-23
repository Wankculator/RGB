# 🚀 RGB Node Setup Instructions for LIGHTCAT

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Linux server (Ubuntu 20.04+ recommended)
- ✅ SSH access to the server
- ✅ At least 2GB RAM and 20GB storage
- ✅ Your 12 or 24 word seed phrase from Tribe Wallet
- ✅ Sudo privileges on the server

## 🔧 Step 1: Connect to Your Server

```bash
# Connect via SSH
ssh your-user@your-server-ip
```

## 📦 Step 2: Download and Run Installation Script

```bash
# Download the installation script
cd ~
wget https://raw.githubusercontent.com/your-repo/rgb-setup/install-rgb-node.sh

# Or if you have the files locally, upload them:
scp /path/to/litecat-website/scripts/install-rgb-node.sh your-user@your-server:~/

# Make the script executable
chmod +x install-rgb-node.sh

# Run the installation
./install-rgb-node.sh
```

## 🔐 Step 3: Import Your Wallet (After Installation)

After the RGB node is installed, import your wallet with the seed phrase:

```bash
# Navigate to RGB directory
cd ~/rgb-node

# Run the secure wallet setup script
./setup-rgb-wallet.sh
```

**Security Notes:**
- The script will ask for your seed phrase word by word
- Words are hidden as you type for security
- The seed phrase is never saved to disk
- History is cleared after import

## ✅ Step 4: Verify Installation

```bash
# Check RGB node status
sudo systemctl status rgb-node

# Check your LIGHTCAT balance
~/rgb-node/check-balance.sh

# View logs
tail -f ~/rgb-node/logs/rgb-node.log
```

## 🔄 Step 5: Enable Automation

```bash
# Start the RGB node service
sudo systemctl start rgb-node
sudo systemctl enable rgb-node

# Update your .env file with RGB settings
nano /path/to/litecat-website/.env
```

Add these lines to your `.env`:
```
# RGB Configuration
USE_MOCK_RGB=false
RGB_NODE_PATH=/home/your-user/rgb-node
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_NETWORK=mainnet
```

## 📝 Step 6: Test Token Transfer

```bash
# Manual test transfer (replace with actual invoice)
~/rgb-node/transfer-tokens.sh "rgb:~/~/~/bc:utxob:..." 100
```

## 🚀 Step 7: Connect to Your Website

Update your website configuration:

```bash
# Restart your Node.js server
cd /path/to/litecat-website
npm run build
pm2 restart litecat-server
```

## 🛡️ Security Checklist

After setup, ensure:
- [ ] RGB node is running as non-root user
- [ ] Firewall rules are configured (only allow necessary ports)
- [ ] Regular backups are scheduled
- [ ] Monitoring is enabled
- [ ] Logs are rotated properly

## 📊 Monitoring Commands

```bash
# Check node health
curl http://localhost:50002/health

# Check balance via API
curl http://localhost:50002/balance

# Monitor transfer logs
tail -f ~/rgb-node/logs/transfers.log

# Check system resources
htop
```

## 🔧 Troubleshooting

### RGB Node Won't Start
```bash
# Check logs
sudo journalctl -u rgb-node -n 50

# Verify configuration
cat ~/rgb-node/config/rgb-node.conf

# Test manually
/usr/local/bin/rgb-node --config ~/rgb-node/config/rgb-node.conf
```

### Balance Shows 0
```bash
# Sync wallet
rgb-cli wallet sync

# Check asset ID
rgb-cli asset list

# Verify network
rgb-cli node info
```

### Transfer Fails
```bash
# Check node connectivity
rgb-cli node peers

# Verify recipient invoice format
rgb-cli invoice validate "invoice-here"

# Check available balance
rgb-cli asset balance rgb:uQsgEYWo-...
```

## 🔄 Daily Operations

### Morning Checklist
```bash
# 1. Check node status
sudo systemctl status rgb-node

# 2. Check balance
~/rgb-node/check-balance.sh

# 3. Process pending deliveries
curl -X POST http://localhost:3001/api/admin/process-pending

# 4. Check logs for errors
grep ERROR ~/rgb-node/logs/rgb-node.log | tail -20
```

### Backup Routine
```bash
# Create wallet backup
~/rgb-node/backup-wallet.sh

# Backup configuration
tar -czf rgb-config-$(date +%Y%m%d).tar.gz ~/rgb-node/config/

# Store backups securely offsite
```

## 📞 Support

If you encounter issues:

1. **Check logs first:**
   ```bash
   tail -100 ~/rgb-node/logs/rgb-node.log
   tail -100 ~/rgb-node/logs/rgb-node-error.log
   ```

2. **Verify services:**
   ```bash
   sudo systemctl status rgb-node
   pm2 status
   ```

3. **Test connectivity:**
   ```bash
   curl http://localhost:50002/health
   ```

## ⚡ Quick Commands Reference

```bash
# Start/Stop RGB node
sudo systemctl start rgb-node
sudo systemctl stop rgb-node
sudo systemctl restart rgb-node

# Check balance
~/rgb-node/check-balance.sh

# Transfer tokens
~/rgb-node/transfer-tokens.sh <invoice> <amount>

# View logs
tail -f ~/rgb-node/logs/rgb-node.log

# Backup wallet
~/rgb-node/backup-wallet.sh

# Process pending orders
curl -X POST http://localhost:3001/api/admin/process-pending
```

## ✅ Setup Complete!

Once everything is running:
1. Your website will automatically distribute tokens when payments are received
2. Monitor the admin dashboard for real-time sales
3. Check logs regularly for any issues
4. Keep your seed phrase secure and never share it

---

**Important**: After successful setup, delete any temporary files and clear your bash history:
```bash
history -c
```