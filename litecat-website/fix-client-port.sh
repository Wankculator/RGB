#!/bin/bash

# Fix client port to 8082

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🔧 Fixing client port..."

# Create remote fix script
cat > /tmp/fix-port-remote.sh << 'FIXSCRIPT'
#!/bin/bash

cd /var/www/rgblightcat

# Check what port serve-ui.js uses
grep -n "listen" serve-ui.js

# Update the client start script to use port 8082
cat > start-ui.sh << 'EOF'
#!/bin/bash
cd /var/www/rgblightcat
PORT=8082 node serve-ui.js
EOF

chmod +x start-ui.sh

# Restart just the client
pm2 restart lightcat-client
pm2 save

echo ""
echo "✅ Client port fixed!"
echo ""
echo "Testing endpoints..."
sleep 3
curl -s http://localhost:3000/api/health && echo " ✅ API working!" || echo " ❌ API not responding"
curl -s http://localhost:8082 > /dev/null && echo " ✅ Client working on port 8082!" || echo " ❌ Client not responding"

FIXSCRIPT

# Upload and run
scp /tmp/fix-port-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/fix-port-remote.sh && bash /tmp/fix-port-remote.sh'

echo ""
echo "✅ Done! Now run the full test:"
echo "./test-full-system.sh"