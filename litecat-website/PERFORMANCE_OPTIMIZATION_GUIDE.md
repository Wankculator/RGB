# 🚀 Performance Optimization Guide

## Current Issue
- All API endpoints taking 2-3 seconds (target: <200ms)
- Page load time 2.9s (target: <2s)

## Quick Wins (Do These First)

### 1. Enable Nginx Caching
```bash
ssh root@147.93.105.138
nano /etc/nginx/sites-available/rgblightcat.com
```

Add caching for static assets:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

location /api/rgb/stats {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 1m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 2. Enable Gzip Compression
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml;
```

### 3. Add API Response Caching
Create `/root/lightcat-api/cache-middleware.js`:
```javascript
const cache = new Map();

function cacheMiddleware(duration = 60) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached && cached.timestamp > Date.now() - duration * 1000) {
      return res.json(cached.data);
    }
    
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
      originalJson.call(this, data);
    };
    
    next();
  };
}

module.exports = cacheMiddleware;
```

Then in your API:
```javascript
const cacheMiddleware = require('./cache-middleware');

// Cache stats for 1 minute
app.get('/api/rgb/stats', cacheMiddleware(60), (req, res) => {
  // existing code
});

// Cache top scores for 30 seconds
app.get('/api/game/top-scores', cacheMiddleware(30), (req, res) => {
  // existing code
});
```

### 4. Use PM2 Cluster Mode
```bash
pm2 delete lightcat-api
pm2 start enhanced-api.js -i max --name lightcat-api
pm2 save
```

## Medium-Term Solutions

### 1. Use CloudFlare (FREE)
- Sign up at cloudflare.com
- Add your domain
- Enable:
  - Auto Minify (HTML, CSS, JS)
  - Brotli compression
  - HTTP/3
  - Cache Everything rule for static assets

### 2. Optimize Database Queries
Since you're using in-memory storage, this is less critical, but when you move to Supabase:
- Add indexes on frequently queried fields
- Use connection pooling
- Cache database results

### 3. Lazy Load Images
```javascript
// Add to your frontend
const images = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      imageObserver.unobserve(img);
    }
  });
});
images.forEach(img => imageObserver.observe(img));
```

## Diagnostic Commands

Run these on your VPS to identify bottlenecks:

```bash
# Check server resources
htop
free -h
df -h

# Check network latency
ping -c 10 google.com
traceroute google.com

# Check Node.js memory usage
ps aux | grep node

# Monitor real-time connections
ss -tuln | grep :3000

# Check Nginx access logs for slow requests
tail -f /var/log/nginx/access.log
```

## Expected Results After Optimization

- Static assets: <50ms (cached)
- API endpoints: <500ms (with caching)
- Page load: <1.5s
- Game load: <2s

## Emergency Performance Fix

If performance is critical, use a CDN for your API:
1. Sign up for CloudFlare (free)
2. Enable "Cache Everything" page rule
3. Set cache TTL to 1 minute for API routes
4. Purge cache when data changes

This will make your API responses instant for most users!