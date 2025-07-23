# 🚀 TOMORROW'S QUICK START GUIDE

## THE ONE COMMAND YOU NEED:

```bash
ssh root@147.93.105.138 'bash -s' < scripts/complete-vps-setup.sh
```

## That's it! This will set up EVERYTHING.

---

## 📋 After Setup Completes (~15 mins):

### 1. Point Your Domain NOW:
Add these DNS records at your provider:
- A record: `rgblightcat.com` → `147.93.105.138`
- A record: `www.rgblightcat.com` → `147.93.105.138`

### 2. Import Your Wallet:
```bash
ssh lightcat@147.93.105.138
~/rgb-node/scripts/import-wallet.sh
# Enter your 12 or 24 word seed phrase
```

### 3. Check Your Balance:
```bash
~/rgb-node/scripts/check-balance.sh
# Should show 21,000,000 LIGHTCAT
```

### 4. Deploy Website:
```bash
~/deploy-website.sh
# Enter your Git repo URL when asked
```

### 5. Get SSL Certificate (after DNS works):
```bash
sudo certbot --nginx -d rgblightcat.com -d www.rgblightcat.com
```

---

## ✅ DONE! Your site will be live at:
## https://www.rgblightcat.com

---

## 📊 Monitor Everything:

```bash
# Watch it run
~/monitor.sh

# Check logs
tail -f ~/rgb-node/logs/rgb-node.log

# View website status
pm2 monit
```

---

## 🔧 If You Need Help:

All documentation is in the `AI_HANDOFF_NOTES.md` file.

Your server details:
- IP: 147.93.105.138
- User: lightcat (not root)
- Domain: www.rgblightcat.com

The system will run 24/7 automatically!