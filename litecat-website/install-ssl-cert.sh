#!/bin/bash

# SSL Certificate Installation Script for RGBLightCat
# This script will retry installing Let's Encrypt certificate

echo "🔐 SSL Certificate Installation for rgblightcat.com"
echo "=================================================="

# Wait if needed
CURRENT_TIME=$(date +%s)
RETRY_TIME=$(date -d "2025-07-24 19:37:00 UTC" +%s)

if [ $CURRENT_TIME -lt $RETRY_TIME ]; then
    WAIT_TIME=$((RETRY_TIME - CURRENT_TIME))
    echo "⏳ Rate limit active. Waiting $WAIT_TIME seconds..."
    sleep $WAIT_TIME
fi

echo "🚀 Installing Let's Encrypt certificate..."

# SSH to server and install certificate
sshpass -p 'ObamaknowsJA8@' ssh root@147.93.105.138 '
    # Try with certbot
    certbot --nginx \
        -d rgblightcat.com \
        -d www.rgblightcat.com \
        --non-interactive \
        --agree-tos \
        --email admin@rgblightcat.com \
        --redirect
    
    # Check if successful
    if [ $? -eq 0 ]; then
        echo "✅ Certificate installed successfully!"
        echo "🔄 Reloading nginx..."
        systemctl reload nginx
        
        echo "📋 Certificate details:"
        certbot certificates
    else
        echo "❌ Certificate installation failed"
        echo "Checking logs..."
        tail -20 /var/log/letsencrypt/letsencrypt.log
    fi
'

echo ""
echo "🌐 Test HTTPS:"
echo "curl -I https://rgblightcat.com"
curl -I https://rgblightcat.com 2>/dev/null | head -5

echo ""
echo "✅ Done!"