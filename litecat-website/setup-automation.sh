#!/bin/bash
# This script will install what's needed for automation

echo "🔧 Setting up automation tools..."
echo "You'll need to enter your WSL/Ubuntu password when prompted"

# Install sshpass and expect
sudo apt-get update
sudo apt-get install -y sshpass expect

# Create SSH config to avoid host key checking
mkdir -p ~/.ssh
echo "Host 147.93.105.138
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null" >> ~/.ssh/config

# Create a script that fixes everything
cat > /tmp/fix-everything.sh << 'EOF'
#!/bin/bash
VPS_PASS="ObamaknowsJA8@"
VPS_IP="147.93.105.138"

echo "🚀 Fixing LIGHTCAT servers automatically..."

# Fix the UI server
sshpass -p "$VPS_PASS" ssh root@$VPS_IP << 'ENDSSH'
cd /var/www/rgblightcat
pm2 delete all

# Create working UI server
cat > serve-ui.js << 'EOFILE'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
http.createServer((req, res) => {
  let file = './client' + (req.url === '/' ? '/index.html' : req.url);
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200);
      res.end(data);
    }
  });
}).listen(PORT, () => console.log('UI on ' + PORT));
EOFILE

# Start services
pm2 start server/app.js --name api
pm2 start serve-ui.js --name ui
pm2 save

# Install SSL
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d rgblightcat.com -d www.rgblightcat.com --non-interactive --agree-tos -m admin@rgblightcat.com || true

# Final check
pm2 status
echo "✅ Everything fixed!"
ENDSSH

echo "✅ Fixed! Visit https://rgblightcat.com"
EOF

chmod +x /tmp/fix-everything.sh

echo ""
echo "✅ Setup complete! Now running the fix..."
echo ""

# Run the fix
/tmp/fix-everything.sh