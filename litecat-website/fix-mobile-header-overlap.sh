#!/bin/bash

# Fix Mobile Header Overlap Script
# This script fixes the LIVE MINT STATUS visibility issue on mobile devices

echo "🔧 Fixing Mobile Header Overlap Issue..."
echo "======================================="

# Server details
SERVER="root@147.93.105.138"
REMOTE_PATH="/var/www/rgblightcat/client"

# Check if we can connect to server
echo "📡 Testing server connection..."
ssh -o ConnectTimeout=5 $SERVER "echo 'Connection successful'" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to server. Please ensure:"
    echo "   1. You have SSH access to $SERVER"
    echo "   2. Your SSH key is configured"
    echo ""
    echo "Manual fix instructions:"
    echo "1. Copy client/index.html to server"
    echo "2. Copy client/styles/responsive-fixes.css to server"
    echo ""
    exit 1
fi

echo "✅ Server connection successful"

# Upload fixed files
echo "📤 Uploading fixed files..."
scp client/index.html $SERVER:$REMOTE_PATH/index.html
scp client/styles/responsive-fixes.css $SERVER:$REMOTE_PATH/styles/responsive-fixes.css

# Verify uploads
echo "🔍 Verifying uploads..."
ssh $SERVER "ls -la $REMOTE_PATH/index.html $REMOTE_PATH/styles/responsive-fixes.css"

echo ""
echo "✅ Mobile header overlap fix applied!"
echo ""
echo "📱 Testing Instructions:"
echo "1. Open https://rgblightcat.com on mobile device"
echo "2. Check that 'LIVE MINT STATUS' text is visible"
echo "3. Scroll down and verify header transitions properly"
echo ""
echo "🔧 What was fixed:"
echo "- Increased stats-section padding-top to 160px on mobile"
echo "- Added dynamic header height adjustment"
echo "- Optimized header height on mobile devices"
echo "- Added z-index fixes for better layering"
echo "- Implemented JavaScript to prevent overlap"
echo ""
echo "📊 Mobile breakpoints:"
echo "- ≤768px: General mobile fixes"
echo "- ≤375px: Small phone fixes (iPhone SE)"
echo "- Dynamic adjustment for all sizes"