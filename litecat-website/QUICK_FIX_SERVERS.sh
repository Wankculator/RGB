#!/bin/bash

# Quick Fix Script - Get LIGHTCAT Servers Running NOW!

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🚀 LIGHTCAT Quick Server Fix"
echo "==========================="
echo ""

# Create remote fix script
cat > /tmp/quick-fix-remote.sh << 'FIXSCRIPT'
#!/bin/bash

cd /var/www/rgblightcat

echo "🔧 Fixing servers..."

# Kill any stuck processes
pkill -f node
pm2 kill

# Create wrapper scripts
cat > start-api.sh << 'EOF'
#!/bin/bash
cd /var/www/rgblightcat
node mock-api-server-live.js
EOF

chmod +x start-api.sh

cat > start-ui.sh << 'EOF'
#!/bin/bash
cd /var/www/rgblightcat
node serve-ui.js
EOF

chmod +x start-ui.sh

# Start with PM2
pm2 start start-api.sh --name lightcat-api
pm2 start start-ui.sh --name lightcat-client
pm2 save
pm2 startup systemd -u root --hp /root

# Check status
echo ""
echo "📊 Server Status:"
pm2 status

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."
sleep 3
curl -s http://localhost:3000/api/health && echo " ✅ API working!" || echo " ❌ API not responding"
curl -s http://localhost:8080 > /dev/null && echo " ✅ UI working!" || echo " ❌ UI not responding"

echo ""
echo "✅ Servers should now be running!"
echo ""
echo "🌐 Test your site:"
echo "   http://rgblightcat.com"
echo ""
echo "🔒 Next: Run SSL setup for HTTPS"

FIXSCRIPT

# Upload and run
echo "📤 Connecting to server..."
scp /tmp/quick-fix-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/quick-fix-remote.sh && bash /tmp/quick-fix-remote.sh'

echo ""
echo "✅ Done! Your servers should be running now."
echo ""
echo "🌐 Visit: http://rgblightcat.com"
echo ""
echo "🔒 To enable SSL, run: ./complete-ssl-setup.sh"