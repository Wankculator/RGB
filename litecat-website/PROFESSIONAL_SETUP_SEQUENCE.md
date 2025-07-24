# 🚀 LIGHTCAT Professional Setup Sequence

Following CLAUDE.md guidelines for the most professional approach.

## 📊 Current Status Check
- ✅ BTCPay Server configured (payments go to your wallet)
- ✅ Platform running locally
- ❌ Database not connected (using mocks)
- ❌ RGB seed not imported
- ❌ Not deployed to production

## 🎯 Professional Setup Order

### Phase 1: Database Foundation (DO NOW)

#### 1️⃣ Set Up Supabase (15 minutes)

**Why First**: Without a database, you can't track real customers or sales.

```bash
# Step 1: Create Supabase Account
# Go to: https://supabase.com
# Sign up (it's free)
# Create new project:
# - Name: lightcat-db
# - Password: (save this!)
# - Region: closest to you

# Step 2: Get Credentials
# Go to Settings → API
# Copy:
# - Project URL
# - anon key
# - service_role key

# Step 3: Run Setup
./scripts/setup-supabase.sh
```

The script will:
- Update your configuration
- Create all tables
- Set up security
- Create backup scripts

### Phase 2: RGB Token Setup (CRITICAL)

#### 2️⃣ Import RGB Seed Phrase (10 minutes)

**Why Second**: You need this to distribute real LIGHTCAT tokens.

```bash
# Have your 24-word seed phrase ready
./scripts/setup-rgb-wallet.sh

# This will:
# - Securely import your wallet
# - Check your LIGHTCAT balance
# - Set up automated transfers
# - Create backup
```

### Phase 3: Production Infrastructure

#### 3️⃣ Domain & VPS Setup (30 minutes)

**Domain Options**:
- lightcat.io
- rgblightcat.com
- lightcattoken.com

**VPS Providers** (Choose one):
- Hetzner Cloud (€4.51/month) - Best value
- DigitalOcean ($6/month)
- Linode ($5/month)

```bash
# After getting VPS:
./scripts/deploy-to-vps.sh YOUR_VPS_IP root YOUR_DOMAIN
```

### Phase 4: Final Configuration

#### 4️⃣ Production Environment Setup

```bash
# Update .env for production
nano .env

# Change:
NODE_ENV=production
CLIENT_URL=https://your-domain.com
USE_MOCK_RGB=false
USE_MOCK_LIGHTNING=false
```

#### 5️⃣ Email Service (Optional but Recommended)

```bash
# SendGrid setup for email notifications
# 1. Create account at sendgrid.com
# 2. Get API key
# 3. Add to .env:
SENDGRID_API_KEY=your-key-here
```

## 🧪 Testing Checklist

### Before Going Live:

```bash
# 1. Test database connection
node scripts/test-supabase.js

# 2. Test payment flow
node scripts/test-payment-flow.js

# 3. Test RGB distribution
node scripts/test-rgb-integration.js

# 4. Full user simulation
node scripts/full-user-simulation.js
```

## 📊 Professional Monitoring Setup

```bash
# Set up PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Set up logs
pm2 logs --lines 100

# Monitor performance
pm2 monit
```

## 🔐 Security Hardening

```bash
# 1. Update all secrets in .env
# 2. Enable firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable

# 3. Set up fail2ban
apt install fail2ban

# 4. Configure nginx rate limiting
# (handled by deployment script)
```

## 🚀 Launch Checklist

### Pre-Launch (Must Complete):
- [ ] Supabase database connected
- [ ] RGB seed imported
- [ ] BTCPay Server active
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] All tests passing
- [ ] Backups configured

### Launch Day:
- [ ] Deploy to production
- [ ] Test live payment
- [ ] Monitor logs
- [ ] Announce on social media
- [ ] Monitor first sales

### Post-Launch:
- [ ] Daily backups running
- [ ] Monitoring alerts set
- [ ] Customer support ready
- [ ] Marketing campaign active

## ⏱️ Time Estimates

- **Phase 1 (Database)**: 15 minutes
- **Phase 2 (RGB)**: 10 minutes
- **Phase 3 (Infrastructure)**: 30-45 minutes
- **Phase 4 (Configuration)**: 15 minutes
- **Testing**: 30 minutes

**Total: 2-2.5 hours to production**

## 🎯 START NOW

Run this command to begin:

```bash
./scripts/setup-supabase.sh
```

After Supabase is set up, we'll move to RGB seed import.

---

**Following CLAUDE.md**: Fast implementation with comprehensive validation at each step.