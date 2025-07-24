# 🚀 LIGHTCAT Manual Deployment Steps

## 📋 Quick Fix for 502 Error

Follow these steps exactly to fix the 502 error on your VPS:

### Step 1: Upload Deployment Package

From your local machine (Windows Terminal):
```bash
cd /mnt/c/Users/sk84l/Downloads/RGB\ LIGHT\ CAT/litecat-website
scp deployment.tar.gz root@147.93.105.138:/tmp/
```

### Step 2: Connect to VPS

```bash
ssh root@147.93.105.138
```

### Step 3: Deploy Application

Once connected to VPS, run these commands:

```bash
# Navigate to application directory
cd /var/www/rgblightcat

# Stop current services
pm2 delete all

# Extract new application files
tar -xzf /tmp/deployment.tar.gz

# Create necessary directories
mkdir -p logs uploads temp

# Install dependencies
npm install --production
```

### Step 4: Configure Environment

Create the .env file:
```bash
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000
CLIENT_URL=https://rgblightcat.com

# Supabase Configuration
SUPABASE_URL=https://xyfqpvxwvlemnraldbjd.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzEwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.GSMgIcht9_O77tPkb1ofQxRixUHt7OdaVXHwUYJ1Y60
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZnFwdnh3dmxlbW5yYWxkYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxwOTYzOSwiZXhwIjoyMDY4Njg1NjM5fQ.dIF_7uErKhpAeBurPGv_oS3gQEfJ6sHQP9mr0FUuC0M

# RGB Configuration (Mock Mode)
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
USE_MOCK_RGB=true
RGB_FALLBACK_TO_MOCK=true

# Lightning Configuration (Mock Mode)
USE_MOCK_LIGHTNING=true

# Security
JWT_SECRET=08f986be66ff4453f80e5493dc4e55d48e713ec28fe0733713fd3b075e6ce2a0
JWT_REFRESH_SECRET=84826a5ef2ac9272db81b552300bff15eb58a6b002c527c3e2f4a3d5360d6ea6
SESSION_SECRET=1b8f47c1729dab9bae3834eb5b818df12ead1059d08d055d1101b621d7e26b7b

# Feature Flags
ENABLE_BULK_PURCHASES=false
ENABLE_RATE_LIMITING=true
ENABLE_WEBHOOK_VALIDATION=true
ENABLE_DEBUG_LOGGING=false
ENABLE_TEST_ENDPOINTS=true
EOF
```

### Step 5: Start Services

```bash
# Start API server
pm2 start server/app.js --name lightcat-api

# Start UI server  
pm2 start serve-ui.js --name lightcat-ui

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 6: Update Nginx Configuration

```bash
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name rgblightcat.com www.rgblightcat.com;

    # Main site - UI server
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
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

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
EOF

# Test and reload Nginx
nginx -t && systemctl reload nginx
```

### Step 7: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs --lines 20

# Test endpoints
curl http://localhost:8082  # Should return HTML
curl http://localhost:3000/health  # Should return {"status":"ok"}

# Test from outside
curl http://rgblightcat.com  # Should show the site!
```

### Step 8: Install SSL Certificate

Once the site is working on HTTP:
```bash
certbot --nginx -d rgblightcat.com -d www.rgblightcat.com
```

## 🚨 Troubleshooting

If you still see 502 errors:

1. **Check PM2 logs:**
   ```bash
   pm2 logs lightcat-api --err
   pm2 logs lightcat-ui --err
   ```

2. **Check if ports are listening:**
   ```bash
   netstat -tlnp | grep -E '3000|8082'
   ```

3. **Check Nginx error log:**
   ```bash
   tail -f /var/log/nginx/error.log
   ```

4. **Restart everything:**
   ```bash
   pm2 restart all
   systemctl restart nginx
   ```

## ✅ Success Indicators

- PM2 shows both services as "online"
- `curl http://localhost:8082` returns HTML
- `curl http://localhost:3000/health` returns `{"status":"ok"}`
- http://rgblightcat.com loads without 502 error
- Game page works at http://rgblightcat.com/game.html

## 📞 Need Help?

If you encounter issues:
1. Copy the error messages from PM2 logs
2. Check which step failed
3. The most common issues are:
   - Missing dependencies (run `npm install` again)
   - Port conflicts (check with `netstat -tlnp`)
   - Permission issues (check file ownership)