#!/bin/bash

# Mobile Viewport Fix Deployment Script for rgblightcat.com
# This script applies the mobile viewport fix to ensure LIVE MINT STATUS appears below the fold

set -e

# Configuration
VPS_IP="147.93.105.138"
VPS_USER="root"
DOMAIN="www.rgblightcat.com"

echo "🚀 Applying Mobile Viewport Fix to rgblightcat.com"
echo "📍 Target: $VPS_USER@$VPS_IP"
echo ""

# Create the fix files locally
echo "📝 Creating fix files..."

# Create viewport-mobile-fix.js
cat > /tmp/viewport-mobile-fix.js << 'EOF'
(function() {
    'use strict';
    
    const style = document.createElement('style');
    style.textContent = `
        @media screen and (max-width: 768px) {
            .hero-section {
                min-height: calc(100vh - 80px) !important;
                padding-bottom: 40px !important;
            }
            .stats-section {
                padding-top: 80px !important;
                margin-top: 0 !important;
                background: #000 !important;
            }
            .stats-section .section-title {
                margin-top: 0 !important;
                padding-top: 20px !important;
            }
        }
        @media screen and (max-width: 480px) {
            .hero-section {
                min-height: calc(100vh - 70px) !important;
            }
            .stats-section {
                padding-top: 100px !important;
            }
        }
    `;
    document.head.appendChild(style);
})();
EOF

# Create deployment script
cat > /tmp/apply-fix.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "🔧 Applying mobile viewport fix on server..."

# Navigate to client directory
cd /var/www/rgblightcat/client

# Backup current index.html
cp index.html index.html.backup-$(date +%Y%m%d-%H%M%S)

# Create js directory if it doesn't exist
mkdir -p js

# Copy the viewport fix file
cp /tmp/viewport-mobile-fix.js js/

# Add inline CSS to index.html before </head>
# First, check if the inline CSS already exists
if ! grep -q "mobile viewport fix inline CSS" index.html; then
    echo "Adding inline CSS to index.html..."
    sed -i '/<\/head>/i \
<!-- mobile viewport fix inline CSS -->\
<style>\
@media (max-width: 768px) {\
    .hero-section { min-height: calc(100vh - 80px) !important; }\
    .stats-section { padding-top: 80px !important; }\
}\
</style>' index.html
fi

# Add script tag before </body> if not already present
if ! grep -q "viewport-mobile-fix.js" index.html; then
    echo "Adding viewport fix script to index.html..."
    sed -i '/<\/body>/i \    <script src="js/viewport-mobile-fix.js"></script>' index.html
fi

# Set proper permissions
chown -R www-data:www-data js/viewport-mobile-fix.js
chmod 644 js/viewport-mobile-fix.js

echo "✅ Mobile viewport fix applied successfully!"
echo ""
echo "📱 Testing the fix:"
echo "1. Visit https://www.rgblightcat.com on a mobile device"
echo "2. The hero section should fill the viewport"
echo "3. LIVE MINT STATUS should appear below when scrolling"
echo ""
echo "🔄 To revert changes:"
echo "cd /var/www/rgblightcat/client"
echo "mv index.html.backup-* index.html"
SCRIPT

# Upload files to VPS
echo "📤 Uploading files to VPS..."
scp /tmp/viewport-mobile-fix.js "$VPS_USER@$VPS_IP:/tmp/"
scp /tmp/apply-fix.sh "$VPS_USER@$VPS_IP:/tmp/"

# Execute on VPS
echo "🚀 Executing fix on VPS..."
ssh "$VPS_USER@$VPS_IP" "bash /tmp/apply-fix.sh"

# Cleanup
rm -f /tmp/viewport-mobile-fix.js
rm -f /tmp/apply-fix.sh

echo ""
echo "✨ Mobile viewport fix deployment complete!"
echo ""
echo "📱 Please test on mobile devices:"
echo "- https://www.rgblightcat.com"
echo "- https://rgblightcat.com"
echo ""
echo "🔍 Verification steps:"
echo "1. Open the site on a mobile device"
echo "2. The hero section should fill the initial viewport"
echo "3. Scroll down to see LIVE MINT STATUS section"
echo "4. Use Chrome DevTools mobile view to test different screen sizes"