#!/bin/bash

# Quick Server Status Check

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🔍 Checking LIGHTCAT Server Status"
echo "=================================="
echo ""

# Create remote check script
cat > /tmp/check-status-remote.sh << 'CHECKSCRIPT'
#!/bin/bash

echo "📊 PM2 Process Status:"
echo "====================="
pm2 status
echo ""

echo "🌐 Nginx Status:"
echo "==============="
systemctl status nginx --no-pager | head -5
echo ""

echo "🔍 Port Listening Status:"
echo "========================"
netstat -tlnp | grep -E "(3000|8082|80|443)"
echo ""

echo "💾 Disk Usage:"
echo "============="
df -h /
echo ""

echo "🧠 Memory Usage:"
echo "==============="
free -h
echo ""

echo "📁 Application Directory:"
echo "========================"
cd /var/www/rgblightcat
pwd
ls -la
echo ""

echo "🔐 Environment Mode:"
echo "==================="
if [ -f .env ]; then
    grep -E "(USE_MOCK|NODE_ENV)" .env | head -5
else
    echo "No .env file found"
fi
echo ""

echo "📝 Recent Logs:"
echo "=============="
if [ -d logs ]; then
    echo "API Logs:"
    tail -5 logs/api.log 2>/dev/null || echo "No API logs"
    echo ""
    echo "Error Logs:"
    tail -5 logs/error.log 2>/dev/null || echo "No error logs"
else
    echo "PM2 Logs:"
    pm2 logs --nostream --lines 5
fi

CHECKSCRIPT

# Upload and run
scp /tmp/check-status-remote.sh $VPS_USER@$VPS_IP:/tmp/ 2>/dev/null
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/check-status-remote.sh && bash /tmp/check-status-remote.sh'

echo ""
echo "✅ Status check complete!"