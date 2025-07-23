# 🚨 LIGHTCAT Production Requirements Checklist

## ❌ CRITICAL MISSING COMPONENTS

### 1. RGB Protocol Setup
**YOU MUST HAVE:**
- [ ] **RGB Node** installed and running
  - Options: rgb-node, Iris Wallet, BitMask
  - Download: https://github.com/RGB-WG/rgb-node
  
- [ ] **Master Wallet with 21M LIGHTCAT tokens**
  ```bash
  # You need to have already:
  1. Created the RGB asset (LIGHTCAT token)
  2. Issued 21,000,000 tokens to your wallet
  3. Have the asset ID (looks like: rgb:2Uw5QH-hqGX93Rh...)
  ```

- [ ] **Wallet Access for Backend**
  ```
  RGB_WALLET_PATH=/path/to/your/wallet.dat
  RGB_WALLET_PASSWORD=your-wallet-password
  RGB_ASSET_ID=rgb:your-actual-asset-id
  ```

### 2. Lightning Network Setup
**YOU MUST HAVE:**
- [ ] **Lightning Node** (Choose one):
  - **Option A: LND**
    ```bash
    # Install LND
    wget https://github.com/lightningnetwork/lnd/releases/download/v0.17.0-beta/lnd-linux-amd64-v0.17.0-beta.tar.gz
    # Configure with Bitcoin node
    ```
  
  - **Option B: Core Lightning**
    ```bash
    # Install CLN
    sudo apt install lightningd
    ```
  
  - **Option C: Hosted Solution**
    - Voltage Cloud: https://voltage.cloud
    - Alby Hub: https://getalby.com
    - BTCPay Server: https://btcpayserver.org

- [ ] **Lightning Credentials**
  ```env
  LIGHTNING_NODE_URL=https://your-node:8080
  LIGHTNING_MACAROON_PATH=/path/to/admin.macaroon
  LIGHTNING_TLS_CERT_PATH=/path/to/tls.cert
  ```

- [ ] **Payment Webhooks**
  - Configure your Lightning node to send webhooks on payment
  - Or use polling (less efficient)

### 3. Database Setup
- [ ] **Supabase Account** (Free tier works)
  1. Sign up: https://supabase.com
  2. Create new project
  3. Get credentials from Settings > API

- [ ] **Run Database Migration**
  ```bash
  # Get connection string from Supabase
  psql "postgresql://postgres:[password]@[host]:5432/postgres" < database/rgb-schema.sql
  ```

### 4. Email Service (Optional but Recommended)
- [ ] **SendGrid Account** (or similar)
  ```env
  SENDGRID_API_KEY=SG.xxxxx
  EMAIL_FROM=noreply@lightcat.xyz
  ```

### 5. Domain & SSL
- [ ] **Domain Name** (e.g., lightcat.xyz)
- [ ] **SSL Certificate** (Let's Encrypt free)
- [ ] **DNS Configuration**
  ```
  A Record: @ -> Your server IP
  A Record: www -> Your server IP
  ```

### 6. Server Requirements
- [ ] **VPS or Cloud Server**
  - Minimum: 2GB RAM, 2 CPU cores
  - Recommended: 4GB RAM, 4 CPU cores
  - Options: DigitalOcean, Linode, AWS, Hetzner

- [ ] **Software Stack**
  ```bash
  - Ubuntu 22.04 LTS
  - Node.js 18+
  - Nginx (reverse proxy)
  - PM2 (process manager)
  - Bitcoin Core (for Lightning)
  ```

## 📝 COMPLETE .env FILE NEEDED

```env
# Server
NODE_ENV=production
PORT=3000
CLIENT_URL=https://lightcat.xyz
API_BASE_URL=https://api.lightcat.xyz

# Database (Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# RGB Protocol (MOST CRITICAL!)
RGB_NODE_URL=http://localhost:50001
RGB_WALLET_PATH=/home/user/lightcat-wallet.dat
RGB_WALLET_PASSWORD=your-secure-password
RGB_ASSET_ID=rgb:2Uw5QH-hqGX93Rh-YU8EqpJP-fRcyJPor-EjBvdQgc-BiXWNgF
RGB_NETWORK=bitcoin

# Lightning Network
LIGHTNING_IMPLEMENTATION=LND # or CLN
LIGHTNING_NODE_URL=https://localhost:8080
LIGHTNING_MACAROON_PATH=/home/user/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
LIGHTNING_TLS_CERT_PATH=/home/user/.lnd/tls.cert

# Security
JWT_SECRET=generate-64-char-random-string
ADMIN_PASSWORD_HASH=$2b$12$xxxxx

# Email (Optional)
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=noreply@lightcat.xyz
SUPPORT_EMAIL=support@lightcat.xyz

# Game Settings
GAME_TIER_1_SCORE=11
GAME_TIER_2_SCORE=18
GAME_TIER_3_SCORE=28

# Token Configuration
TOTAL_SUPPLY=21000000
TOKENS_PER_BATCH=700
SATOSHIS_PER_BATCH=2000
```

## 🛠️ SETUP COMMANDS

### 1. Clone and Install
```bash
git clone [your-repo]
cd litecat-website
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
nano .env
```

### 3. Setup Database
```bash
# Run migrations
npm run db:migrate
```

### 4. Setup RGB Wallet
```bash
# Import your wallet with tokens
rgb-cli import-wallet /path/to/wallet.dat
rgb-cli sync
```

### 5. Start Services
```bash
# Start Lightning node
lightningd --daemon

# Start RGB node
rgb-node --daemon

# Start application
pm2 start ecosystem.config.js
```

## ⚠️ WITHOUT THESE, YOU CANNOT:

1. **Accept real Lightning payments** (no Lightning node)
2. **Distribute RGB tokens** (no RGB wallet with tokens)
3. **Store purchase data** (no database)
4. **Track users** (no database)
5. **Send confirmations** (no email service)
6. **Handle real traffic** (no production server)

## 🤔 CURRENT STATUS

Right now you have:
- ✅ Beautiful UI
- ✅ Game mechanics
- ✅ Payment flow UI
- ✅ Mobile responsive

But you're missing:
- ❌ RGB tokens to distribute
- ❌ Lightning node for payments
- ❌ Database for records
- ❌ Production server
- ❌ Domain and SSL

## 🚀 QUICK START OPTIONS

### Option 1: "Just Testing UI"
Keep using mock API - everything works for demo

### Option 2: "Testnet First"
1. Use Bitcoin testnet
2. Create test RGB tokens
3. Use testnet Lightning node
4. Test everything safely

### Option 3: "Full Production"
Follow complete checklist above

## 💡 MY RECOMMENDATION

Start with testnet:
1. Create RGB tokens on testnet
2. Set up testnet Lightning node  
3. Test complete flow
4. Then move to mainnet

This way you can verify everything works before handling real money!