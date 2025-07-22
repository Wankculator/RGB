#!/bin/bash

# Vercel Deployment Script for LITECAT Frontend

set -e

echo "🚀 LITECAT Vercel Deployment"
echo "============================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

# Build production files
echo "🏗️  Building production files..."
npm run build:production

# Create Vercel configuration
echo "📝 Creating Vercel configuration..."
cat > vercel.json << EOF
{
  "version": 2,
  "name": "litecat-frontend",
  "builds": [
    {
      "src": "dist/client/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.litecat.xyz/api/\$1"
    },
    {
      "src": "/ws",
      "dest": "wss://api.litecat.xyz/ws"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/client/\$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)\\.(js|css|png|jpg|gif|svg|ico)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.litecat.xyz",
    "NEXT_PUBLIC_WS_URL": "wss://api.litecat.xyz/ws"
  }
}
EOF

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
if [ "$1" == "production" ]; then
    vercel --prod
else
    vercel
fi

echo "✅ Deployment complete!"