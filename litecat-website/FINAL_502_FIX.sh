#!/bin/bash

# Fix 502 error - ensure nginx can reach the Node.js server

ssh root@147.93.105.138 << 'EOF'
# Check what's running
echo "Checking PM2 status..."
pm2 list

# Check if server is actually listening on port 3000
echo ""
echo "Checking port 3000..."
netstat -tlnp | grep :3000 || echo "Port 3000 not listening!"

# Check server logs
echo ""
echo "Checking server logs..."
pm2 logs lightcat --lines 10

# Test local connection
echo ""
echo "Testing local connection..."
curl -v http://localhost:3000/api/health

# If server is crashed, restart it
pm2 restart lightcat

# Wait a moment
sleep 3

# Test again
echo ""
echo "Testing after restart..."
curl http://localhost:3000/api/health

# Check nginx error log
echo ""
echo "Nginx errors:"
tail -5 /var/log/nginx/error.log

# Final status
echo ""
echo "Final PM2 status:"
pm2 status
EOF