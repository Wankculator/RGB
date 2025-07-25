#!/bin/bash

# Deploy Mobile Fix to LIGHTCAT Server
# This script deploys the mobile visibility fix

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
VPS_IP="147.93.105.138"
VPS_USER="root"
REMOTE_DIR="/var/www/rgblightcat"

echo -e "${BLUE}📱 LIGHTCAT Mobile Fix Deployment${NC}"
echo -e "${YELLOW}Target: $VPS_USER@$VPS_IP${NC}"
echo ""

# Step 1: Create the mobile fix files locally if they don't exist
echo -e "${BLUE}📝 Preparing mobile fix files...${NC}"

# Step 2: Upload the fix files
echo -e "${BLUE}📤 Uploading mobile fix files...${NC}"

# Try different SSH options for compatibility
SSH_OPTIONS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10"

# Upload CSS file
echo "Uploading CSS fix..."
scp $SSH_OPTIONS client/css/ultimate-mobile-fix.css $VPS_USER@$VPS_IP:$REMOTE_DIR/client/css/ 2>/dev/null || {
    echo -e "${YELLOW}Direct upload failed, trying alternative method...${NC}"
    # Create CSS on server directly
    ssh $SSH_OPTIONS $VPS_USER@$VPS_IP "cat > $REMOTE_DIR/client/css/ultimate-mobile-fix.css" < client/css/ultimate-mobile-fix.css
}

# Upload JS file
echo "Uploading JS fix..."
scp $SSH_OPTIONS client/js/ultimate-mobile-fix.js $VPS_USER@$VPS_IP:$REMOTE_DIR/client/js/ 2>/dev/null || {
    echo -e "${YELLOW}Direct upload failed, trying alternative method...${NC}"
    # Create JS on server directly
    ssh $SSH_OPTIONS $VPS_USER@$VPS_IP "cat > $REMOTE_DIR/client/js/ultimate-mobile-fix.js" < client/js/ultimate-mobile-fix.js
}

# Step 3: Update index.html on the server
echo -e "${BLUE}🔧 Updating index.html...${NC}"

ssh $SSH_OPTIONS $VPS_USER@$VPS_IP << 'ENDSSH'
set -e

# Colors for remote output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

cd /var/www/rgblightcat

echo -e "${BLUE}📝 Backing up index.html...${NC}"
cp client/index.html client/index.html.backup-mobile-fix

echo -e "${BLUE}🔧 Adding mobile fix references to index.html...${NC}"

# Check if the fix is already applied
if grep -q "ultimate-mobile-fix.css" client/index.html; then
    echo -e "${YELLOW}Mobile fix CSS already included${NC}"
else
    # Add CSS reference before closing </head>
    sed -i '/<\/head>/i \    <link rel="stylesheet" href="css/ultimate-mobile-fix.css">' client/index.html
    echo -e "${GREEN}✅ Added mobile fix CSS${NC}"
fi

if grep -q "ultimate-mobile-fix.js" client/index.html; then
    echo -e "${YELLOW}Mobile fix JS already included${NC}"
else
    # Add JS reference before closing </body>
    sed -i '/<\/body>/i \    <script src="js/ultimate-mobile-fix.js"></script>' client/index.html
    echo -e "${GREEN}✅ Added mobile fix JS${NC}"
fi

# Verify the changes
echo -e "${BLUE}🔍 Verifying changes...${NC}"
if grep -q "ultimate-mobile-fix" client/index.html; then
    echo -e "${GREEN}✅ Mobile fix references added successfully${NC}"
else
    echo -e "${RED}❌ Failed to add mobile fix references${NC}"
fi

# Clear any caches
echo -e "${BLUE}🧹 Clearing caches...${NC}"
# Clear Nginx cache if it exists
rm -rf /var/cache/nginx/* 2>/dev/null || true

# Restart services to ensure changes take effect
echo -e "${BLUE}🔄 Restarting services...${NC}"
pm2 restart lightcat-ui || true
systemctl reload nginx || true

echo -e "${GREEN}🎉 Mobile fix deployment complete!${NC}"
echo -e "${YELLOW}The LIVE MINT STATUS section should now be visible on mobile devices${NC}"
echo -e "${YELLOW}Test at: https://rgblightcat.com on a mobile device${NC}"

ENDSSH

echo -e "${GREEN}✅ Mobile fix deployment completed${NC}"
echo -e "${BLUE}📱 Testing instructions:${NC}"
echo "1. Open https://rgblightcat.com on a mobile device"
echo "2. Look for the LIVE MINT STATUS section below the header"
echo "3. The section should have 300px padding at the top"
echo "4. Check browser console for 'Ultimate mobile fix loaded' message"