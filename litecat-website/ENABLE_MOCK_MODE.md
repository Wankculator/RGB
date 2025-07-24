# 🔒 Enable Mock Mode for Safe Testing

## Quick Steps:

### 1. SSH to your server:
```bash
ssh root@147.93.105.138
```
(Enter your password when prompted)

### 2. Copy and paste this entire block:
```bash
cd /var/www/rgblightcat

# Backup current config
cp .env .env.backup

# Enable full mock mode
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Supabase
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60

# MOCK MODE - SAFE TESTING
USE_MOCK_RGB=true
USE_MOCK_LIGHTNING=true
USE_BTCPAY=false
ACCEPT_REAL_PAYMENTS=false

# RGB
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po

# Security
JWT_SECRET=test-secret-change-in-production
SESSION_SECRET=test-session-change-in-production
EOF

# Restart services
pm2 restart all

echo "✅ Mock mode enabled - Safe for testing!"
```

### 3. Start the app if not running:
```bash
pm2 status

# If nothing is running:
pm2 start ecosystem.config.js
```

## ✅ Now You Have:
- **Mock RGB tokens** (no seed needed)
- **Mock payments** (no real money)
- **Real database** (for testing)
- **Safe testing environment**

## 🧪 Test Everything:
1. Visit https://rgblightcat.com (or http://147.93.105.138)
2. Play the game
3. Try to buy tokens (it's fake money)
4. Test all features

## 📝 Testing Checklist:
- [ ] Game loads and plays
- [ ] Scores save correctly
- [ ] Tier unlocking works
- [ ] Mock payment flow completes
- [ ] Stats update properly
- [ ] Mobile responsive works

## 🚀 After Testing:
When everything works perfectly, we'll:
1. Import your RGB seed phrase
2. Enable real payments
3. Go live for real!

**Start by SSHing to your server and enabling mock mode!**