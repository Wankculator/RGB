# 🚀 LIGHTCAT Complete Production Setup Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Testnet Setup](#testnet-setup)
4. [Production Infrastructure](#production-infrastructure)
5. [Deployment Process](#deployment-process)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Quick Reference](#quick-reference)

---

## 🎯 Overview

LIGHTCAT is the first cat meme token on RGB Protocol with Lightning Network integration. This guide covers the complete setup from testnet to production.

### Architecture Components:
- **Frontend**: React + Three.js game
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **RGB Protocol**: Token issuance and distribution
- **Lightning Network**: Payment processing
- **Infrastructure**: Ubuntu server with Nginx

---

## ✅ Prerequisites

### Required Knowledge:
- Basic Linux command line
- Node.js and npm
- Bitcoin and Lightning basics
- Server administration

### Required Accounts:
- [ ] Supabase account (free tier works)
- [ ] Domain name (e.g., lightcat.xyz)
- [ ] VPS provider account (DigitalOcean, AWS, etc.)
- [ ] SendGrid account (optional, for emails)
- [ ] Sentry account (optional, for error tracking)

### Local Development Setup:
```bash
# Clone repository
git clone [your-repo-url]
cd litecat-website

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development servers
npm run dev
```

---

## 🧪 Testnet Setup

### Step 1: Run Testnet Setup Script
```bash
cd scripts
chmod +x setup-testnet.sh
./setup-testnet.sh
```

This script will:
- Install Bitcoin Core (testnet)
- Install LND (testnet)
- Install RGB Node
- Create systemd services
- Generate configuration files

### Step 2: Start Services
```bash
# Start Bitcoin Core
sudo systemctl start bitcoind-testnet
sudo systemctl enable bitcoind-testnet

# Wait for sync (check progress)
bitcoin-cli -testnet getblockchaininfo

# Start LND (after Bitcoin syncs)
sudo systemctl start lnd-testnet
sudo systemctl enable lnd-testnet

# Start RGB Node
sudo systemctl start rgb-testnet
sudo systemctl enable rgb-testnet
```

### Step 3: Create Testnet Wallet
```bash
# Run wallet setup
~/lightcat-testnet/setup-wallet.sh

# Follow prompts to:
# 1. Create LND wallet
# 2. Get testnet Bitcoin from faucet
# 3. Create RGB wallet
# 4. Issue LIGHTCAT testnet tokens
```

### Step 4: Configure Application
```bash
# Copy testnet environment
cp ~/lightcat-testnet/.env.testnet .env

# Update RGB_ASSET_ID with your generated asset ID
nano .env
```

### Step 5: Test Payment Flow
```bash
# Start application
npm run dev

# Open browser to http://localhost:8082
# Test complete payment flow with testnet
```

---

## 🏗️ Production Infrastructure

### Step 1: Server Setup

#### Option A: DigitalOcean
```bash
# Create Ubuntu 22.04 droplet
# Recommended: 4GB RAM, 2 vCPUs, 80GB SSD
# Enable backups and monitoring

# SSH into server
ssh root@your-server-ip

# Run initial setup
cd /tmp
wget https://raw.githubusercontent.com/[your-repo]/scripts/setup-production.sh
chmod +x setup-production.sh
./setup-production.sh
```

#### Option B: AWS EC2
```bash
# Launch Ubuntu 22.04 instance
# Recommended: t3.medium
# Configure security groups:
# - SSH (22)
# - HTTP (80)
# - HTTPS (443)
# - Lightning (9735)
```

### Step 2: Lightning Network Setup
```bash
# Run Lightning setup script
cd /var/www/litecat-website/scripts
./setup-lightning.sh

# Choose your implementation:
# 1. LND (self-hosted)
# 2. Core Lightning
# 3. Voltage Cloud (recommended for beginners)
# 4. Alby Hub
# 5. BTCPay Server
```

### Step 3: RGB Wallet Setup
```bash
# Create production RGB wallet
./setup-rgb-wallet.sh --network mainnet

# This will:
# 1. Create RGB wallet
# 2. Issue 21M LIGHTCAT tokens
# 3. Create backup
# 4. Generate configuration

# IMPORTANT: Save the seed phrase securely!
```

### Step 4: Database Setup
```bash
# Configure Supabase
./setup-supabase.sh

# Enter your Supabase credentials when prompted
# This will:
# 1. Test connection
# 2. Run migrations
# 3. Set up Row Level Security
# 4. Create indexes
# 5. Set up backup script
```

### Step 5: SSL Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d lightcat.xyz -d www.lightcat.xyz

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📦 Deployment Process

### Initial Deployment
```bash
# On your local machine
cd litecat-website

# Set deployment variables
export DEPLOY_HOST=lightcat.xyz
export DEPLOY_USER=ubuntu

# Run deployment
./scripts/deploy-production.sh
```

### Continuous Deployment
```bash
# Make changes locally
git add .
git commit -m "feat: your changes"
git push origin main

# Deploy updates
./scripts/deploy-production.sh

# Or rollback if needed
./scripts/deploy-production.sh rollback
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring
```bash
# Run monitoring setup
cd /var/www/litecat-website/scripts
./setup-monitoring.sh

# This configures:
# - PM2 monitoring
# - Application logging
# - Health checks
# - Uptime monitoring
# - Metrics collection
```

### Daily Operations

#### Check Application Health
```bash
# View status
pm2 status

# Check logs
pm2 logs lightcat-api

# Monitor resources
pm2 monit

# Check health endpoint
curl https://lightcat.xyz/api/health
```

#### Monitor Payments
```bash
# Check Lightning node
lncli getinfo
lncli listchannels
lncli listpayments

# Check RGB wallet
rgb-cli wallet balance lightcat-master

# View payment logs
tail -f server/logs/payments-*.log
```

### Backup Schedule
```bash
# Set up automated backups
crontab -e

# Add these lines:
0 3 * * * /var/www/litecat-website/scripts/backup-recovery.sh backup
0 4 * * * /var/www/litecat-website/scripts/backup-supabase.sh
```

### Manual Backup
```bash
# Perform full backup
./scripts/backup-recovery.sh backup

# Verify backup
./scripts/backup-recovery.sh verify

# List backups
./scripts/backup-recovery.sh list
```

---

## 🔧 Troubleshooting

### Common Issues

#### RGB Node Not Responding
```bash
# Check service status
sudo systemctl status rgb-testnet

# View logs
journalctl -u rgb-testnet -f

# Restart service
sudo systemctl restart rgb-testnet

# Resync wallet
rgb-cli wallet sync lightcat-master
```

#### Lightning Payment Not Detected
```bash
# Check LND status
lncli getinfo

# Check for pending invoices
lncli listinvoices | grep -A5 "OPEN"

# Check webhook configuration
curl http://localhost:3000/api/webhooks/lightning

# Force payment check
node scripts/check-pending-payments.js
```

#### Database Connection Issues
```bash
# Test Supabase connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check credentials in .env
grep SUPABASE .env

# Run manual migration
psql "$DATABASE_URL" < database/rgb-schema.sql
```

#### Application Errors
```bash
# Check PM2 logs
pm2 logs lightcat-api --lines 100

# Check error logs
tail -f server/logs/error-*.log

# Restart application
pm2 restart lightcat-api

# Clear and restart
pm2 delete lightcat-api
pm2 start ecosystem.config.js
```

### Emergency Recovery
```bash
# Restore from backup
./scripts/backup-recovery.sh restore

# Restore specific component
# 1. Stop services
pm2 stop all
sudo systemctl stop lnd-testnet

# 2. Restore files
tar -xzf ~/lightcat-backups/full-*/application.tar.gz

# 3. Restart services
pm2 start ecosystem.config.js
sudo systemctl start lnd-testnet
```

---

## 📋 Quick Reference

### Essential Commands
```bash
# Application
pm2 status                    # Check app status
pm2 logs lightcat-api         # View logs
pm2 restart lightcat-api      # Restart app

# Lightning
lncli getinfo                 # Node info
lncli walletbalance          # Check balance
lncli listinvoices           # List invoices

# RGB
rgb-cli wallet balance lightcat-master    # Token balance
rgb-cli wallet sync lightcat-master       # Sync wallet

# Database
psql "$DATABASE_URL" -c "SELECT * FROM get_global_stats();"

# Monitoring
curl https://lightcat.xyz/api/health      # Health check
curl https://lightcat.xyz/api/rgb/stats   # Stats
```

### Important Files
```
/var/www/litecat-website/
├── .env                      # Environment variables
├── server/logs/              # Application logs
├── ecosystem.config.js       # PM2 configuration
└── scripts/                  # Utility scripts

~/lightcat-testnet/           # Testnet data
├── bitcoin/                  # Bitcoin data
├── lightning/               # Lightning data
└── rgb/                     # RGB data

~/lightcat-backups/          # Backup files
```

### Environment Variables
```bash
# Critical variables that must be set:
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
RGB_ASSET_ID=rgb:your-asset-id
LIGHTNING_NODE_URL=your_node_url
JWT_SECRET=your_secret
```

### Support Contacts
- RGB Protocol: https://rgb.tech
- Lightning Network: https://docs.lightning.engineering
- Supabase: https://supabase.com/docs
- This Project: [your-support-email]

---

## 🎉 Launch Checklist

### Pre-Launch
- [ ] All services running on testnet
- [ ] Complete payment flow tested
- [ ] Backups configured and tested
- [ ] Monitoring active
- [ ] SSL certificate installed
- [ ] Domain DNS configured

### Launch Day
- [ ] Switch to mainnet configuration
- [ ] Fund Lightning node
- [ ] Open Lightning channels
- [ ] Test with small real payment
- [ ] Monitor logs closely
- [ ] Announce launch!

### Post-Launch
- [ ] Monitor for 24 hours
- [ ] Check all payment flows
- [ ] Review error logs
- [ ] Optimize based on usage
- [ ] Plan scaling if needed

---

**Remember: Always test on testnet first! 🧪**

For additional help, check the scripts in the `/scripts` directory or refer to the individual component documentation.