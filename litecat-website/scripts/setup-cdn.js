const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// CDN Configuration for multiple providers
const cdnConfigs = {
  cloudflare: {
    name: 'Cloudflare',
    assetTypes: ['js', 'css', 'jpg', 'png', 'gif', 'svg', 'woff', 'woff2'],
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  },
  cloudfront: {
    name: 'AWS CloudFront',
    assetTypes: ['js', 'css', 'jpg', 'png', 'gif', 'svg', 'woff', 'woff2'],
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff'
    }
  },
  jsdelivr: {
    name: 'jsDelivr (for libraries)',
    baseUrl: 'https://cdn.jsdelivr.net/npm/',
    libraries: {
      'qrcode': '1.5.3',
      'axios': '1.4.0'
    }
  }
};

// Generate asset manifest with hashes
function generateAssetManifest() {
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    assets: {}
  };

  const clientDir = path.join(__dirname, '..', 'client');
  const assetDirs = ['', 'styles', 'scripts', 'scripts/game'];

  assetDirs.forEach(dir => {
    const fullPath = path.join(clientDir, dir);
    if (!fs.existsSync(fullPath)) return;

    const files = fs.readdirSync(fullPath);
    files.forEach(file => {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && !file.startsWith('.')) {
        const ext = path.extname(file).toLowerCase();
        if (['.js', '.css', '.jpg', '.png', '.gif', '.svg'].includes(ext)) {
          const content = fs.readFileSync(filePath);
          const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
          const relativePath = path.relative(clientDir, filePath).replace(/\\/g, '/');
          
          manifest.assets[relativePath] = {
            hash,
            size: stat.size,
            mtime: stat.mtime,
            cdn: shouldUseCDN(ext)
          };
        }
      }
    });
  });

  return manifest;
}

function shouldUseCDN(ext) {
  const cdnExtensions = ['.js', '.css', '.jpg', '.png', '.gif', '.svg', '.woff', '.woff2'];
  return cdnExtensions.includes(ext);
}

// Generate production HTML with CDN URLs
function generateProductionHTML() {
  const indexPath = path.join(__dirname, '..', 'client', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  const manifest = generateAssetManifest();
  const cdnBase = process.env.CDN_URL || 'https://cdn.litecat.xyz';
  
  // Replace asset URLs with CDN URLs
  Object.entries(manifest.assets).forEach(([file, info]) => {
    if (info.cdn) {
      const originalUrl = file;
      const cdnUrl = `${cdnBase}/${file}?v=${info.hash}`;
      
      // Replace in HTML
      html = html.replace(
        new RegExp(`(src|href)=["']${originalUrl}["']`, 'g'),
        `$1="${cdnUrl}"`
      );
    }
  });
  
  // Add preconnect for CDN
  const preconnect = `<link rel="preconnect" href="${cdnBase}">
  <link rel="dns-prefetch" href="${cdnBase}">`;
  html = html.replace('</head>', `${preconnect}\n</head>`);
  
  // Save production HTML
  const prodPath = path.join(__dirname, '..', 'client', 'index-prod.html');
  fs.writeFileSync(prodPath, html);
  
  return prodPath;
}

// Create Cloudflare Workers script for edge optimization
function createCloudflareWorker() {
  const workerScript = `
// Cloudflare Workers script for LITECAT CDN
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Cache settings by file type
  const cacheSettings = {
    '.js': { ttl: 31536000, swr: 86400 },
    '.css': { ttl: 31536000, swr: 86400 },
    '.jpg': { ttl: 31536000, swr: 604800 },
    '.png': { ttl: 31536000, swr: 604800 },
    '.gif': { ttl: 31536000, swr: 604800 },
    '.svg': { ttl: 31536000, swr: 604800 },
    '.woff': { ttl: 31536000, swr: 2592000 },
    '.woff2': { ttl: 31536000, swr: 2592000 }
  }
  
  const ext = path.extname(url.pathname)
  const settings = cacheSettings[ext] || { ttl: 3600, swr: 300 }
  
  // Check cache
  const cache = caches.default
  let response = await cache.match(request)
  
  if (!response) {
    // Fetch from origin
    response = await fetch(request)
    
    // Clone response for modification
    response = new Response(response.body, response)
    
    // Set cache headers
    response.headers.set('Cache-Control', \`public, max-age=\${settings.ttl}, stale-while-revalidate=\${settings.swr}\`)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Cache the response
    event.waitUntil(cache.put(request, response.clone()))
  }
  
  return response
}
`;

  const workerPath = path.join(__dirname, '..', 'cloudflare-worker.js');
  fs.writeFileSync(workerPath, workerScript);
  return workerPath;
}

// Create nginx configuration for CDN
function createNginxConfig() {
  const nginxConfig = `
# LITECAT CDN Nginx Configuration
server {
    listen 80;
    listen 443 ssl http2;
    server_name cdn.litecat.xyz;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/litecat-cdn.crt;
    ssl_certificate_key /etc/ssl/private/litecat-cdn.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Root directory
    root /var/www/litecat-cdn;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;
    gzip_min_length 1000;

    # Cache settings by file type
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    location ~* \.(woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
        add_header Access-Control-Allow-Origin "*";
    }

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
`;

  const nginxPath = path.join(__dirname, '..', 'nginx-cdn.conf');
  fs.writeFileSync(nginxPath, nginxConfig);
  return nginxPath;
}

// Main setup function
async function setupCDN() {
  console.log('🌐 Setting up CDN configuration...\n');

  // Generate asset manifest
  console.log('📦 Generating asset manifest...');
  const manifest = generateAssetManifest();
  const manifestPath = path.join(__dirname, '..', 'client', 'assets-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Asset manifest created: ${manifestPath}`);
  console.log(`   Total assets: ${Object.keys(manifest.assets).length}`);

  // Generate production HTML
  console.log('\n📄 Generating production HTML...');
  const prodHtml = generateProductionHTML();
  console.log(`✅ Production HTML created: ${prodHtml}`);

  // Create Cloudflare Worker
  console.log('\n☁️  Creating Cloudflare Worker script...');
  const workerPath = createCloudflareWorker();
  console.log(`✅ Cloudflare Worker created: ${workerPath}`);

  // Create Nginx config
  console.log('\n🔧 Creating Nginx configuration...');
  const nginxPath = createNginxConfig();
  console.log(`✅ Nginx config created: ${nginxPath}`);

  // Create deployment script
  console.log('\n📝 Creating CDN deployment script...');
  const deployScript = `#!/bin/bash
# CDN Deployment Script

CDN_BUCKET="litecat-cdn"
CDN_DISTRIBUTION="E1234567890ABC"

echo "🚀 Deploying assets to CDN..."

# Sync to S3 (CloudFront)
aws s3 sync ./client s3://\${CDN_BUCKET}/ \\
  --exclude "*.html" \\
  --exclude ".*" \\
  --exclude "node_modules/*" \\
  --cache-control "public, max-age=31536000" \\
  --metadata-directive REPLACE

# Invalidate CloudFront cache
aws cloudfront create-invalidation \\
  --distribution-id \${CDN_DISTRIBUTION} \\
  --paths "/*"

echo "✅ CDN deployment complete!"
`;

  const deployPath = path.join(__dirname, '..', 'deploy-cdn.sh');
  fs.writeFileSync(deployPath, deployScript);
  fs.chmodSync(deployPath, '755');
  console.log(`✅ CDN deployment script created: ${deployPath}`);

  // Summary
  console.log('\n✨ CDN Setup Complete!\n');
  console.log('Next steps:');
  console.log('1. Configure your CDN provider (Cloudflare/CloudFront)');
  console.log('2. Update CDN_URL in your .env file');
  console.log('3. Deploy assets using: ./deploy-cdn.sh');
  console.log('4. Update DNS to point cdn.litecat.xyz to your CDN');
}

// Run setup
setupCDN().catch(console.error);