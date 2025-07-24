# 🚀 LIGHTCAT PROJECT MASTER HANDOFF DOCUMENT
**Date:** July 24, 2025, 7:00 PM UTC  
**Project:** LIGHTCAT - RGB Protocol Token with Lightning Payments  
**Status:** WEBSITE LIVE AT http://rgblightcat.com ✅

---

## 🎯 CURRENT STATUS SUMMARY

### ✅ WHAT'S WORKING:
1. **Website is LIVE** at http://rgblightcat.com
2. **UI Server** - Running stable on port 8082 via systemd
3. **Basic API** - Running on port 3000 (mock endpoints only)
4. **Game** - Fully playable with tier unlock system
5. **Nginx** - Configured and serving the site
6. **Domain** - rgblightcat.com pointing to VPS (147.93.105.138)

### ❌ WHAT'S NOT WORKING YET:
1. **SSL Certificate** - Site is HTTP only (not HTTPS)
2. **Real API Server** - Full backend crashes due to missing dependencies
3. **RGB Integration** - Not connected to real RGB node
4. **Lightning Payments** - Not connected to Voltage node
5. **Database Operations** - Supabase configured but not integrated

---

## 🖥️ VPS SERVER DETAILS

### Access Information:
```bash
# SSH Access
ssh root@147.93.105.138
Password: ObamaknowsJA8@

# Hostinger API Key (for VPS management)
u5LQpQCLw0v2WBZgH7AgLRWW6UXCP7PLHZFuFhzB7b275121
```

### Server Configuration:
- **OS:** Ubuntu 25.04
- **IP:** 147.93.105.138
- **Domain:** rgblightcat.com
- **Location:** /var/www/rgblightcat/

### Running Services:
```bash
# Check service status
systemctl status lightcat-ui    # UI server (port 8082)
systemctl status lightcat-api   # API server (port 3000)
systemctl status nginx          # Web server

# View logs
journalctl -u lightcat-ui -f   # UI logs
journalctl -u lightcat-api -f  # API logs
```

### Service Files Location:
- `/etc/systemd/system/lightcat-ui.service` - UI server systemd config
- `/etc/systemd/system/lightcat-api.service` - API server systemd config
- `/etc/nginx/sites-available/rgblightcat` - Nginx config

---

## 💾 DATABASE CONFIGURATION

### Supabase (Configured but not integrated):
- **Project ID:** xyfqpvxwvlemnraldbjd
- **URL:** https://xyfqpvxwvlemnraldbjd.supabase.co
- **Service Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

### Tables Created:
- users
- game_scores  
- rgb_invoices
- lightning_payments
- purchases
- rgb_transfers
- system_metrics
- wallet_balances
- admin_actions

---

## ⚡ PAYMENT INFRASTRUCTURE

### Lightning Network (Voltage - Not Connected):
- **Node URL:** https://lightcat.m.voltageapp.io:8080
- **Node Pubkey:** 0353b274a637b8d...2861aae847d2b2e
- **Status:** Credentials needed (admin.macaroon, tls.cert)
- **Required:** Download from Voltage dashboard

### RGB Protocol (Not Set Up):
- **Asset ID:** rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
- **Network:** Mainnet
- **Status:** Need to install RGB node and import seed phrase

### BTCPay Server (Alternative Option):
- **URL:** https://btcpay0.voltageapp.io
- **Store ID:** HNQsGSwdyQb8Vg3y6srogKjXCDXdARt9Q113N4urcUcG
- **API Key:** 1dpQWkChRWpEWiilo1D1ZlI0PEv7EOIIIhliMiD7LnM

---

## 📁 PROJECT STRUCTURE

### Local Development:
```
/mnt/c/Users/sk84l/Downloads/RGB LIGHT CAT/litecat-website/
├── client/              # Frontend files (HTML, JS, CSS)
├── server/              # Backend API (Node.js/Express)
├── database/            # SQL schemas
├── scripts/             # Setup and deployment scripts
├── .env                 # Environment variables
└── package.json         # Node.js dependencies
```

### VPS Production:
```
/var/www/rgblightcat/
├── client/              # Frontend files
├── server/              # Backend API
├── stable-ui.js         # Current UI server
├── stable-api.js        # Current API server (minimal)
├── serve-ui.js          # Alternative UI server
└── minimal-api.js       # Alternative API server
```

---

## 🔧 CURRENT TECHNICAL ISSUES

### 1. Main API Server Crashes
The full backend (`server/app.js`) crashes because:
- Missing environment variables
- Database connection issues
- Dependency problems

**Current Workaround:** Using `stable-api.js` with mock endpoints

### 2. SSL Certificate Failed
Certbot fails because:
- DNS might not be fully propagated
- Let's Encrypt rate limits
- IPv6 configuration issues

**Solution:** Wait 24-48 hours, then retry

### 3. Payment Integration Not Working
- Lightning node credentials not downloaded
- RGB node not installed
- Mock mode currently enabled

---

## 📋 TASKS TO COMPLETE

### High Priority:
1. **Fix SSL Certificate**
   ```bash
   ssh root@147.93.105.138
   certbot --nginx -d rgblightcat.com -d www.rgblightcat.com
   ```

2. **Fix Main API Server**
   - Debug why server/app.js crashes
   - Fix database connections
   - Ensure all dependencies installed

3. **Connect Lightning Network**
   - Download credentials from Voltage
   - Update .env with macaroon/cert paths
   - Test Lightning invoice generation

### Medium Priority:
4. **Install RGB Node**
   - Run setup script: `./scripts/setup-rgb-wallet.sh`
   - Import seed phrase
   - Configure RGB endpoints

5. **Database Integration**
   - Connect API to Supabase
   - Test user registration
   - Enable score tracking

6. **Enable Real Payments**
   - Switch off mock mode
   - Test payment flow
   - Monitor transactions

### Low Priority:
7. **Performance Optimization**
   - Add CDN for assets
   - Enable caching
   - Optimize images

8. **Monitoring Setup**
   - Install monitoring tools
   - Set up alerts
   - Configure backups

9. **Security Hardening**
   - Configure firewall rules
   - Set up fail2ban
   - Regular security updates

---

## 🚀 QUICK COMMANDS REFERENCE

### Local Development:
```bash
# Navigate to project
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website

# Start development servers
npm run dev

# Check local servers
curl http://localhost:8082  # UI
curl http://localhost:3000/health  # API
```

### VPS Management:
```bash
# SSH to VPS
ssh root@147.93.105.138

# Restart services
systemctl restart lightcat-ui
systemctl restart lightcat-api
systemctl restart nginx

# View logs
journalctl -u lightcat-ui -f
journalctl -u lightcat-api -f
tail -f /var/log/nginx/error.log

# Check what's running
pm2 status
systemctl status lightcat-ui
systemctl status lightcat-api
netstat -tlnp | grep -E ':8082|:3000|:80'
```

### Deployment:
```bash
# Create deployment package
tar -czf deployment.tar.gz --exclude=node_modules server client package.json

# Upload to VPS
scp deployment.tar.gz root@147.93.105.138:/tmp/

# Deploy on VPS
ssh root@147.93.105.138
cd /var/www/rgblightcat
tar -xzf /tmp/deployment.tar.gz
npm install --production
systemctl restart lightcat-ui lightcat-api
```

---

## 🎮 GAME CONFIGURATION

### Tier System:
- **Bronze Tier:** Score 11+ (unlock 5 batches max)
- **Silver Tier:** Score 18+ (unlock 8 batches max)
- **Gold Tier:** Score 28+ (unlock 10 batches max)

### Token Economics:
- **Total Supply:** 21,000,000 LIGHTCAT tokens
- **Total Batches:** 30,000
- **Price per Batch:** 2,000 satoshis
- **Tokens per Batch:** 700

---

## ⚠️ IMPORTANT NOTES

1. **Site is Currently HTTP Only**
   - No sensitive data should be transmitted
   - SSL must be installed before real payments

2. **Using Mock Services**
   - Mock RGB enabled (USE_MOCK_RGB=true)
   - Mock Lightning enabled (USE_MOCK_LIGHTNING=true)
   - Switch to real services after testing

3. **Automated sshpass Available**
   - sshpass installed locally for automation
   - Can run: `sshpass -p 'ObamaknowsJA8@' ssh root@147.93.105.138 [command]`

4. **Services Auto-Restart**
   - Both UI and API configured with systemd
   - Will restart automatically if they crash
   - Will start on server reboot

---

## 📞 NEXT STEPS TO RESUME

When you restart this chat:

1. **Check Site Status:**
   ```bash
   curl -I http://rgblightcat.com
   ```

2. **If Site is Down:**
   ```bash
   sshpass -p 'ObamaknowsJA8@' ssh root@147.93.105.138 'systemctl restart lightcat-ui lightcat-api nginx'
   ```

3. **Continue With:**
   - Installing SSL certificate
   - Fixing the main API server
   - Connecting payment systems
   - Enabling database integration

---

## 🎯 SUCCESS METRICS

### Current Achievement:
- ✅ Website accessible worldwide
- ✅ Game fully playable
- ✅ Services stable with auto-restart
- ✅ Basic infrastructure deployed

### Still Needed:
- ❌ Secure HTTPS connection
- ❌ Real payment processing
- ❌ User data persistence
- ❌ RGB token distribution

---

**IMPORTANT:** Save this file! It contains all passwords, API keys, and critical information needed to continue the project.

**Current Status:** The LIGHTCAT website is LIVE at http://rgblightcat.com with a playable game. Payment integration and SSL certificate are the next priorities.