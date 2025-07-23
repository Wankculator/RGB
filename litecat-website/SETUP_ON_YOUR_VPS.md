# 🚀 Setting Up RGB Node on Your VPS

## Your Server Details:
- **IP**: 147.93.105.138
- **Hostname**: srv890142.hstgr.cloud
- **OS**: Ubuntu 25.04
- **Resources**: 2 CPU cores, 8GB RAM, 100GB disk (Perfect for RGB node!)

## 📋 Quick Setup Commands

### Step 1: Connect to Your Server
```bash
ssh root@147.93.105.138
```

### Step 2: Create a Non-Root User (Security Best Practice)
```bash
# Create user for RGB node
adduser lightcat
usermod -aG sudo lightcat

# Switch to the new user
su - lightcat
```

### Step 3: Quick Installation (One Command)
```bash
# Download and run the quick setup
wget -O - https://raw.githubusercontent.com/your-repo/scripts/quick-rgb-setup.sh | bash
```

### OR Manual Installation:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y build-essential pkg-config libssl-dev libzmq3-dev git curl jq screen

# 3. Create RGB directory
mkdir -p ~/rgb-node/{data,config,backups,logs}
cd ~/rgb-node

# 4. Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# 5. Clone and build RGB node
git clone https://github.com/RGB-WG/rgb-node.git
cd rgb-node
git checkout v0.10.0
cargo build --release

# 6. Install binaries
sudo cp target/release/rgb-node /usr/local/bin/
sudo cp target/release/rgb-cli /usr/local/bin/
sudo chmod +x /usr/local/bin/rgb-node
sudo chmod +x /usr/local/bin/rgb-cli
```

### Step 4: Configure RGB Node
```bash
# Create configuration
cat > ~/rgb-node/config/rgb-node.conf << EOF
network = "mainnet"
data_dir = "/home/lightcat/rgb-node/data"
rpc_port = 50001
rpc_host = "127.0.0.1"
electrum_server = "electrum.blockstream.info:50002"
log_level = "info"
log_file = "/home/lightcat/rgb-node/logs/rgb-node.log"
rpc_auth = true
rpc_user = "rgbuser"
rpc_password = "$(openssl rand -base64 32)"
max_connections = 50
cache_size = 1000
EOF
```

### Step 5: Create Systemd Service
```bash
sudo tee /etc/systemd/system/rgb-node.service > /dev/null << EOF
[Unit]
Description=RGB Node for LIGHTCAT Token
After=network.target

[Service]
Type=simple
User=lightcat
ExecStart=/usr/local/bin/rgb-node --config /home/lightcat/rgb-node/config/rgb-node.conf
Restart=always
RestartSec=10
StandardOutput=append:/home/lightcat/rgb-node/logs/rgb-node.log
StandardError=append:/home/lightcat/rgb-node/logs/rgb-node-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

### Step 6: Import Your Wallet
```bash
# Create secure wallet import script
cat > ~/rgb-node/import-wallet.sh << 'EOF'
#!/bin/bash
echo "🔐 RGB Wallet Import"
echo "==================="
echo ""
echo "Enter your seed phrase word by word (hidden for security)"
echo ""

WORDS=()
for i in {1..24}; do
    read -s -p "Word $i (or press Enter if done): " WORD
    echo ""
    if [ -z "$WORD" ]; then
        break
    fi
    WORDS+=("$WORD")
done

SEED="${WORDS[*]}"
rgb-cli wallet import --words "$SEED" --name "lightcat-main"
unset SEED WORDS

echo "✅ Wallet imported!"
echo "🔄 Syncing..."
rgb-cli wallet sync

echo "💰 Checking LIGHTCAT balance..."
rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
EOF

chmod +x ~/rgb-node/import-wallet.sh

# Run it
./import-wallet.sh
```

### Step 7: Start RGB Node
```bash
# Enable and start the service
sudo systemctl enable rgb-node
sudo systemctl start rgb-node

# Check status
sudo systemctl status rgb-node

# View logs
tail -f ~/rgb-node/logs/rgb-node.log
```

### Step 8: Install Your LIGHTCAT Website
```bash
# Clone your website repository
cd ~
git clone [your-repo-url] litecat-website
cd litecat-website

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
```

Update `.env`:
```
# Server Configuration
PORT=3001
HOST=0.0.0.0

# RGB Configuration
USE_MOCK_RGB=false
RGB_NODE_PATH=/home/lightcat/rgb-node
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_NETWORK=mainnet

# Lightning (your existing config)
LIGHTNING_NODE_URL=your-voltage-url
LIGHTNING_MACAROON=your-macaroon
```

### Step 9: Setup PM2 for Node.js
```bash
# Install PM2
sudo npm install -g pm2

# Start your application
pm2 start server/server.js --name litecat-api
pm2 start server/websocket-server.js --name litecat-ws

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 10: Configure Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/litecat
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name srv890142.hstgr.cloud;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/litecat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 11: Set Up SSL with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d srv890142.hstgr.cloud
```

### Step 12: Configure Firewall
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 🔒 Security Checklist

```bash
# 1. Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# 2. Create backups
mkdir -p ~/backups
crontab -e
# Add: 0 3 * * * /home/lightcat/rgb-node/backup-wallet.sh

# 3. Monitor disk space
df -h

# 4. Set up fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

## 📊 Testing Your Setup

```bash
# 1. Check RGB node health
curl http://localhost:50002/health

# 2. Check your token balance
~/rgb-node/check-balance.sh

# 3. Test website
curl http://srv890142.hstgr.cloud

# 4. Check all services
sudo systemctl status rgb-node
pm2 status
sudo systemctl status nginx
```

## 🚀 Quick Commands for Daily Use

```bash
# Check RGB balance
rgb-cli asset balance rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po

# Process pending orders
curl -X POST http://localhost:3001/api/admin/process-pending

# View recent transfers
tail -20 ~/rgb-node/logs/transfers.log

# Restart services
sudo systemctl restart rgb-node
pm2 restart all

# Check logs
pm2 logs litecat-api
tail -f ~/rgb-node/logs/rgb-node.log
```

## 🎉 Your Server is Ready!

Once everything is set up:
1. Your website will be accessible at: https://srv890142.hstgr.cloud
2. RGB node will automatically process token transfers
3. Lightning payments will trigger automatic distribution
4. All logs are available for monitoring

## Need Help?

- RGB logs: `~/rgb-node/logs/`
- Website logs: `pm2 logs`
- System logs: `sudo journalctl -u rgb-node`

Your Mumbai VPS is now a fully automated LIGHTCAT token distribution server! 🚀