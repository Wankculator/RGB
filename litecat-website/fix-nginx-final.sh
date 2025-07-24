#!/bin/bash
# Fix Nginx to serve the working UI

# Update Nginx config
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;
    
    # Main site - UI server on 8082
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API endpoints when fixed
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test and reload
nginx -t && systemctl reload nginx

# Verify UI is still running
if netstat -tlnp | grep -q ':8082'; then
    echo "✅ UI server is listening on port 8082"
else
    echo "❌ UI server not listening! Restarting..."
    cd /var/www/rgblightcat
    node serve-ui.js &
fi

# Test the site
sleep 2
response=$(curl -s -o /dev/null -w "%{http_code}" http://rgblightcat.com)
if [ "$response" = "200" ]; then
    echo "🎉 SUCCESS! Your site is now live at http://rgblightcat.com"
    echo ""
    echo "Next steps:"
    echo "1. Visit http://rgblightcat.com to see your site"
    echo "2. The API server needs to be fixed separately"
    echo "3. SSL can be installed once everything is stable"
else
    echo "Site returned HTTP $response"
    echo "Checking what's wrong..."
    curl -v http://localhost:8082
fi