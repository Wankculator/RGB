# 🚀 Quick Setup Guide for Your Mumbai VPS

## Step 1: Upload the Setup Script

From your local computer, run this command:

```bash
scp scripts/setup-mumbai-vps.sh root@147.93.105.138:~/
```

When prompted, enter your root password.

## Step 2: Connect to Your Server

```bash
ssh root@147.93.105.138
```

## Step 3: Run the Setup Script

```bash
chmod +x setup-mumbai-vps.sh
./setup-mumbai-vps.sh
```

This will take about 10-15 minutes and will:
- ✅ Create a secure user account
- ✅ Install RGB node
- ✅ Set up all dependencies
- ✅ Configure firewall
- ✅ Set up Nginx

## Step 4: Switch to the New User

```bash
su - lightcat
```

## Step 5: Import Your Wallet

```bash
cd ~/rgb-node/scripts
./import-wallet.sh
```

Enter your seed phrase word by word when prompted (it will be hidden for security).

## Step 6: Start RGB Node

```bash
sudo systemctl start rgb-node
```

## Step 7: Check Your Balance

```bash
./check-balance.sh
```

## Step 8: Check System Status

```bash
./check-status.sh
```

## 🎉 That's It!

Your server is now running the RGB node and ready to automatically distribute LIGHTCAT tokens!

### Useful Commands:

```bash
# Monitor the system
~/monitor.sh

# Check RGB node logs
tail -f ~/rgb-node/logs/rgb-node.log

# Backup your wallet
~/rgb-node/scripts/backup-wallet.sh

# Manual token transfer
~/rgb-node/scripts/transfer-tokens.sh <invoice> <amount>
```

### Access Your Server:
- SSH: `ssh lightcat@147.93.105.138`
- Web: `http://147.93.105.138` (after setting up website)

### Optional: Set Up SSL Certificate

```bash
~/setup-ssl.sh
```

This will make your site available at `https://srv890142.hstgr.cloud`