#!/bin/bash

# Complete SSL Certificate Setup for rgblightcat.com

VPS_IP="147.93.105.138"
VPS_USER="root"

echo "🔒 Setting up SSL Certificate for rgblightcat.com"
echo "=============================================="
echo ""

# Create remote SSL setup script
cat > /tmp/ssl-setup-remote.sh << 'SSLSCRIPT'
#!/bin/bash

cd /var/www/rgblightcat

echo "📋 Current status check..."
echo ""

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "🔄 Starting Nginx..."
    systemctl start nginx
fi

# Check if servers are running
echo ""
echo "📊 PM2 Status:"
pm2 status

# Verify domain is accessible
echo ""
echo "🌐 Testing domain accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://rgblightcat.com | grep -q "200\|301\|302\|404"; then
    echo "✅ Domain is accessible"
else
    echo "⚠️  Domain may not be fully accessible yet"
fi

# Update Nginx configuration for Let's Encrypt
echo ""
echo "📝 Updating Nginx configuration..."

cat > /etc/nginx/sites-available/rgblightcat << 'NGINXCONF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/rgblightcat/client;
        allow all;
    }

    # Client app
    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXCONF

# Reload nginx
nginx -t && systemctl reload nginx

# Create webroot directory for Let's Encrypt
mkdir -p /var/www/rgblightcat/client/.well-known/acme-challenge
chmod -R 755 /var/www/rgblightcat/client

echo ""
echo "🔒 Installing SSL Certificate..."
echo ""

# Try to get SSL certificate
certbot certonly --webroot \
    -w /var/www/rgblightcat/client \
    -d rgblightcat.com \
    -d www.rgblightcat.com \
    --non-interactive \
    --agree-tos \
    --email admin@rgblightcat.com \
    --force-renewal

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL Certificate obtained successfully!"
    
    # Update Nginx with SSL configuration
    cat > /etc/nginx/sites-available/rgblightcat << 'NGINXSSL'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rgblightcat.com www.rgblightcat.com;

    ssl_certificate /etc/letsencrypt/live/rgblightcat.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rgblightcat.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client app
    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXSSL

    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    # Set up auto-renewal
    echo "0 0,12 * * * root certbot renew --quiet && systemctl reload nginx" > /etc/cron.d/certbot-renew
    
    echo ""
    echo "🎉 SSL Setup Complete!"
    echo ""
    echo "Your site is now available at:"
    echo "  🔒 https://rgblightcat.com"
    echo "  🔒 https://www.rgblightcat.com"
    echo ""
    echo "HTTP traffic will redirect to HTTPS automatically."
    
else
    echo ""
    echo "⚠️  SSL Certificate installation failed."
    echo "This might be because:"
    echo "1. DNS is still propagating (wait a few more minutes)"
    echo "2. Port 80 is blocked"
    echo "3. Domain verification failed"
    echo ""
    echo "You can retry with: certbot --nginx -d rgblightcat.com -d www.rgblightcat.com"
fi

echo ""
echo "📊 Final Status:"
echo ""
pm2 status
echo ""
systemctl status nginx --no-pager | head -10

SSLSCRIPT

# Upload and run
echo "📤 Connecting to server..."
scp /tmp/ssl-setup-remote.sh $VPS_USER@$VPS_IP:/tmp/
ssh $VPS_USER@$VPS_IP 'chmod +x /tmp/ssl-setup-remote.sh && bash /tmp/ssl-setup-remote.sh'

echo ""
echo "✅ SSL setup process complete!"
echo ""
echo "🌐 Test your site:"
echo "  - https://rgblightcat.com"
echo "  - https://www.rgblightcat.com"