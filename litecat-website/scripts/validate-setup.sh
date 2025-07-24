#!/bin/bash

# LIGHTCAT Setup Validation Script
# Validates all components are properly configured

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 LIGHTCAT Setup Validation${NC}"
echo "============================"
echo ""

ERRORS=0
WARNINGS=0

# Function to check status
check_status() {
    local test_name=$1
    local test_command=$2
    local is_critical=${3:-true}
    
    echo -n "Checking $test_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        if [ "$is_critical" = true ]; then
            echo -e "${RED}❌ FAILED${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  WARNING${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# 1. Check Node.js and npm
echo -e "${BLUE}1. System Requirements${NC}"
check_status "Node.js installed" "command -v node"
check_status "npm installed" "command -v npm"
check_status "Git installed" "command -v git"
echo ""

# 2. Check dependencies
echo -e "${BLUE}2. Dependencies${NC}"
check_status "node_modules exists" "[ -d node_modules ]"
check_status "package.json exists" "[ -f package.json ]"
echo ""

# 3. Check environment configuration
echo -e "${BLUE}3. Environment Configuration${NC}"
check_status ".env file exists" "[ -f .env ]"

if [ -f .env ]; then
    # Check critical environment variables
    check_status "JWT_SECRET configured" "grep -q 'JWT_SECRET=' .env && ! grep -q 'JWT_SECRET=$' .env"
    check_status "ADMIN_API_KEY configured" "grep -q 'ADMIN_API_KEY=' .env && ! grep -q 'ADMIN_API_KEY=$' .env"
    check_status "Supabase configured" "grep -q 'SUPABASE_URL=' .env && ! grep -q 'SUPABASE_URL=your_supabase_url' .env" false
    check_status "SendGrid configured" "grep -q 'SENDGRID_API_KEY=' .env && ! grep -q 'SENDGRID_API_KEY=$' .env" false
fi
echo ""

# 4. Check directory structure
echo -e "${BLUE}4. Directory Structure${NC}"
check_status "server directory" "[ -d server ]"
check_status "client directory" "[ -d client ]"
check_status "scripts directory" "[ -d scripts ]"
check_status "server/logs directory" "[ -d server/logs ]"
check_status "voltage-credentials directory" "[ -d voltage-credentials ]"
echo ""

# 5. Check key files
echo -e "${BLUE}5. Key Files${NC}"
check_status "server/app.js" "[ -f server/app.js ]"
check_status "client/index.html" "[ -f client/index.html ]"
check_status "config.js" "[ -f config.js ]"
check_status "RGB schema" "[ -f database/rgb-schema.sql ]"
echo ""

# 6. Check services
echo -e "${BLUE}6. Service Files${NC}"
check_status "lightningService.js" "[ -f server/services/lightningService.js ]"
check_status "rgbService.js" "[ -f server/services/rgbService.js ]"
check_status "emailService.js" "[ -f server/services/emailService.js ]"
check_status "rgbPaymentController.js" "[ -f server/controllers/rgbPaymentController.js ]"
echo ""

# 7. Check routes
echo -e "${BLUE}7. Route Files${NC}"
check_status "rgbRoutes.js" "[ -f server/routes/rgbRoutes.js ]"
check_status "lightningRoutes.js" "[ -f server/routes/lightningRoutes.js ]"
check_status "webhooks.js" "[ -f server/routes/webhooks.js ]"
echo ""

# 8. Check game files
echo -e "${BLUE}8. Game Files${NC}"
check_status "game.html" "[ -f client/game.html ]"
check_status "ProGame.js" "[ -f client/js/game/ProGame.js ]"
check_status "main.js" "[ -f client/js/game/main.js ]"
echo ""

# 9. Check deployment scripts
echo -e "${BLUE}9. Deployment Scripts${NC}"
check_status "deploy-to-vps.sh" "[ -f scripts/deploy-to-vps.sh ]"
check_status "quick-deploy.sh" "[ -f scripts/quick-deploy.sh ]"
check_status "setup-voltage.sh" "[ -f scripts/setup-voltage.sh ]"
check_status "install-rgb-node.sh" "[ -f scripts/install-rgb-node.sh ]"
echo ""

# 10. Check if servers are running
echo -e "${BLUE}10. Server Status (per CLAUDE.md)${NC}"
check_status "UI Server (8082)" "curl -s http://localhost:8082/ | grep -q 'RGBLightCat'" false
check_status "API Server (3000)" "curl -s http://localhost:3000/health | grep -q 'ok'" false
check_status "Game loads" "curl -s http://localhost:8082/game.html | grep -q 'ProGame.js'" false
echo ""

# 11. Check API endpoints
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${BLUE}11. API Endpoints${NC}"
    check_status "RGB stats endpoint" "curl -s http://localhost:3000/api/rgb/stats | grep -q 'success'" false
    check_status "Lightning info endpoint" "curl -s http://localhost:3000/api/lightning/info | grep -q 'success'" false
    echo ""
fi

# 12. Check Voltage credentials
echo -e "${BLUE}12. Lightning Setup${NC}"
check_status "Voltage credentials directory" "[ -d voltage-credentials ]" false
if [ -d voltage-credentials ]; then
    check_status "admin.macaroon" "[ -f voltage-credentials/admin.macaroon ]" false
    check_status "tls.cert" "[ -f voltage-credentials/tls.cert ]" false
fi
echo ""

# 13. Check email templates
echo -e "${BLUE}13. Email Templates${NC}"
check_status "Email templates directory" "[ -d server/templates/email ]" false
if [ -d server/templates/email ]; then
    check_status "payment-confirmed.html" "[ -f server/templates/email/payment-confirmed.html ]" false
    check_status "lightning-invoice.html" "[ -f server/templates/email/lightning-invoice.html ]" false
fi
echo ""

# Summary
echo -e "${BLUE}==============================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}==============================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "Your LIGHTCAT setup is complete and ready."
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Setup complete with $WARNINGS warnings${NC}"
    echo "The application should work but some features may be limited."
else
    echo -e "${RED}❌ Setup has $ERRORS errors and $WARNINGS warnings${NC}"
    echo "Please fix the errors before proceeding."
fi

echo ""

# Provide next steps based on status
if [ $ERRORS -gt 0 ]; then
    echo -e "${BLUE}To fix errors:${NC}"
    echo "1. Run: ./scripts/complete-setup.sh"
    echo "2. Check error messages above"
    echo "3. Consult documentation in /docs"
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${BLUE}To resolve warnings:${NC}"
    echo "1. Configure Supabase credentials in .env"
    echo "2. Set up Voltage Lightning: ./scripts/setup-voltage.sh"
    echo "3. Configure SendGrid for emails"
    echo "4. Start servers: npm run dev"
else
    echo -e "${BLUE}Everything looks good! 🎉${NC}"
    echo ""
    echo "Start development:"
    echo "  npm run dev"
    echo ""
    echo "Access the app:"
    echo "  http://localhost:8082"
fi

exit $ERRORS