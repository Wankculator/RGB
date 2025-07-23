# 🚀 ONE COMMAND SETUP - Get Running in 5 Minutes!

## The Magic Command (Copy & Paste This):

```bash
ssh root@147.93.105.138 'bash -s' < scripts/complete-vps-setup.sh
```

That's it! This single command will:
- ✅ Set up everything for 24/7 operation
- ✅ Configure www.rgblightcat.com
- ✅ Install RGB node with auto-restart
- ✅ Set up SSL-ready nginx
- ✅ Enable monitoring and backups

## 📋 After Running the Command:

### 1. Point Your Domain (Do this NOW):
Go to your domain registrar and add:
- A record: `rgblightcat.com` → `147.93.105.138`
- A record: `www.rgblightcat.com` → `147.93.105.138`

### 2. Import Your Wallet:
```bash
ssh lightcat@147.93.105.138
~/rgb-node/scripts/import-wallet.sh
```

### 3. Deploy Your Website:
```bash
~/deploy-website.sh
```

### 4. Get SSL Certificate (after DNS propagates):
```bash
sudo certbot --nginx -d rgblightcat.com -d www.rgblightcat.com
```

## 🎉 That's ALL!

Your site will be live at https://www.rgblightcat.com running 24/7!

## 📊 Monitor Your 24/7 Operation:

```bash
# Check everything is running
ssh lightcat@147.93.105.138
pm2 monit

# View RGB node logs
tail -f ~/rgb-node/logs/rgb-node.log

# Check your balance
~/rgb-node/scripts/check-balance.sh
```

## 🔧 If You Need the Script on Server:

Alternative method:
```bash
# Step 1: Copy script to server
scp scripts/complete-vps-setup.sh root@147.93.105.138:~/

# Step 2: Run it
ssh root@147.93.105.138
chmod +x complete-vps-setup.sh && ./complete-vps-setup.sh
```

## ⚡ Quick DNS Setup:

If using Cloudflare:
1. Add A record: `@` → `147.93.105.138` (for rgblightcat.com)
2. Add A record: `www` → `147.93.105.138` (for www.rgblightcat.com)
3. Set Proxy Status: DNS only (grey cloud) initially

If using GoDaddy/Namecheap:
1. Go to DNS Management
2. Add A record: Host `@`, Points to `147.93.105.138`
3. Add A record: Host `www`, Points to `147.93.105.138`

## 🎯 Everything is Automated:

- ✅ RGB node auto-starts on boot
- ✅ Auto-restarts if it crashes
- ✅ Monitors itself every minute
- ✅ Backs up wallet every 6 hours
- ✅ Cleans old logs weekly
- ✅ Handles thousands of token sales

Your LIGHTCAT platform will run 24/7 without any manual intervention!