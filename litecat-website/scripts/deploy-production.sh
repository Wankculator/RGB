#!/bin/bash

# LIGHTCAT Production Deployment Script
# Handles full deployment with zero-downtime

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🚀 LIGHTCAT Production Deployment${NC}"
echo "===================================="
echo ""

# Configuration
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/litecat-website}"
PM2_APP_NAME="${PM2_APP_NAME:-lightcat-api}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking Prerequisites...${NC}"
    
    # Check if host is set
    if [ -z "$DEPLOY_HOST" ]; then
        echo -e "${RED}❌ DEPLOY_HOST not set${NC}"
        echo "Usage: DEPLOY_HOST=your-server.com ./deploy-production.sh"
        exit 1
    fi
    
    # Check SSH access
    if ! ssh -o ConnectTimeout=5 $DEPLOY_USER@$DEPLOY_HOST "echo 'SSH OK'" &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to $DEPLOY_HOST${NC}"
        echo "Check SSH access and try again"
        exit 1
    fi
    echo -e "${GREEN}✅ SSH connection successful${NC}"
    
    # Check local build
    if [ ! -d "client" ] || [ ! -d "server" ]; then
        echo -e "${RED}❌ Project structure not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Project structure verified${NC}"
    
    echo ""
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running Tests...${NC}"
    
    # Run linting
    echo "Running ESLint..."
    npm run lint || {
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    }
    
    # Run tests if available
    if [ -f "package.json" ] && grep -q "\"test\":" package.json; then
        echo "Running tests..."
        npm test || {
            echo -e "${RED}❌ Tests failed${NC}"
            exit 1
        }
    fi
    
    echo -e "${GREEN}✅ All tests passed${NC}"
    echo ""
}

# Function to build application
build_application() {
    echo -e "${BLUE}🔨 Building Application...${NC}"
    
    # Install dependencies
    echo "Installing dependencies..."
    npm ci --production=false
    
    # Build frontend
    echo "Building frontend..."
    npm run build || {
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    }
    
    # Create deployment package
    echo "Creating deployment package..."
    tar -czf deploy.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.env \
        --exclude=deploy.tar.gz \
        --exclude=backups \
        --exclude=logs \
        client server database scripts package*.json ecosystem.config.js
    
    echo -e "${GREEN}✅ Build complete${NC}"
    echo ""
}

# Function to backup current deployment
backup_current_deployment() {
    if [ "$BACKUP_BEFORE_DEPLOY" != "true" ]; then
        return
    fi
    
    echo -e "${BLUE}💾 Backing up current deployment...${NC}"
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        if [ -d "$DEPLOY_PATH" ]; then
            BACKUP_DIR="$DEPLOY_PATH/../backups/deploy-\$(date +%Y%m%d-%H%M%S)"
            mkdir -p "\$BACKUP_DIR"
            
            # Backup application files
            tar -czf "\$BACKUP_DIR/app.tar.gz" -C "$DEPLOY_PATH" .
            
            # Backup .env if exists
            if [ -f "$DEPLOY_PATH/.env" ]; then
                cp "$DEPLOY_PATH/.env" "\$BACKUP_DIR/.env.backup"
            fi
            
            # Backup database
            if command -v pg_dump &> /dev/null && [ -f "$DEPLOY_PATH/.env" ]; then
                source "$DEPLOY_PATH/.env"
                if [ ! -z "\$DATABASE_URL" ]; then
                    pg_dump "\$DATABASE_URL" | gzip > "\$BACKUP_DIR/database.sql.gz"
                fi
            fi
            
            echo "✅ Backup created: \$BACKUP_DIR"
        fi
EOF
    
    echo -e "${GREEN}✅ Backup complete${NC}"
    echo ""
}

# Function to deploy application
deploy_application() {
    echo -e "${BLUE}📦 Deploying Application...${NC}"
    
    # Upload deployment package
    echo "Uploading deployment package..."
    scp deploy.tar.gz $DEPLOY_USER@$DEPLOY_HOST:/tmp/
    
    # Deploy on server
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        set -e
        
        # Create deployment directory if not exists
        sudo mkdir -p $DEPLOY_PATH
        sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH
        
        # Extract new deployment
        cd $DEPLOY_PATH
        tar -xzf /tmp/deploy.tar.gz
        rm /tmp/deploy.tar.gz
        
        # Install production dependencies
        npm ci --production
        
        # Run database migrations
        if [ -f "scripts/migrate.js" ]; then
            node scripts/migrate.js || echo "⚠️  Migration failed - check manually"
        fi
        
        # Set up logs directory
        mkdir -p server/logs
        
        echo "✅ Files deployed"
EOF
    
    echo -e "${GREEN}✅ Deployment complete${NC}"
    echo ""
}

# Function to reload application
reload_application() {
    echo -e "${BLUE}♻️  Reloading Application...${NC}"
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        cd $DEPLOY_PATH
        
        # Check if PM2 is running
        if pm2 list | grep -q "$PM2_APP_NAME"; then
            # Reload with zero downtime
            pm2 reload ecosystem.config.js --update-env
            echo "✅ Application reloaded"
        else
            # Start fresh
            pm2 start ecosystem.config.js
            pm2 save
            echo "✅ Application started"
        fi
        
        # Show status
        pm2 list
EOF
    
    echo -e "${GREEN}✅ Application reloaded${NC}"
    echo ""
}

# Function to run post-deployment checks
post_deployment_checks() {
    echo -e "${BLUE}🔍 Running Post-Deployment Checks...${NC}"
    
    # Wait for application to stabilize
    echo "Waiting for application to stabilize..."
    sleep 5
    
    # Check application health
    echo "Checking application health..."
    
    # Check API endpoint
    API_URL="https://$DEPLOY_HOST/api/health"
    if curl -sf "$API_URL" > /dev/null; then
        echo -e "${GREEN}✅ API health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  API health check failed - check manually${NC}"
    fi
    
    # Check frontend
    FRONTEND_URL="https://$DEPLOY_HOST"
    if curl -sf "$FRONTEND_URL" | grep -q "LIGHTCAT"; then
        echo -e "${GREEN}✅ Frontend check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend check failed - check manually${NC}"
    fi
    
    # Check RGB stats endpoint
    STATS_URL="https://$DEPLOY_HOST/api/rgb/stats"
    if curl -sf "$STATS_URL" > /dev/null; then
        echo -e "${GREEN}✅ RGB stats endpoint check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  RGB stats endpoint check failed${NC}"
    fi
    
    # Check logs for errors
    echo ""
    echo "Recent application logs:"
    ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && pm2 logs $PM2_APP_NAME --lines 20 --nostream"
    
    echo ""
}

# Function to rollback deployment
rollback_deployment() {
    echo -e "${RED}🔄 Rolling Back Deployment...${NC}"
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        LATEST_BACKUP=\$(ls -t $DEPLOY_PATH/../backups | head -1)
        if [ ! -z "\$LATEST_BACKUP" ]; then
            echo "Rolling back to: \$LATEST_BACKUP"
            
            # Stop application
            pm2 stop $PM2_APP_NAME
            
            # Restore files
            cd $DEPLOY_PATH
            tar -xzf "$DEPLOY_PATH/../backups/\$LATEST_BACKUP/app.tar.gz"
            
            # Restore .env
            if [ -f "$DEPLOY_PATH/../backups/\$LATEST_BACKUP/.env.backup" ]; then
                cp "$DEPLOY_PATH/../backups/\$LATEST_BACKUP/.env.backup" .env
            fi
            
            # Restart application
            pm2 start ecosystem.config.js
            
            echo "✅ Rollback complete"
        else
            echo "❌ No backup found for rollback"
        fi
EOF
}

# Function to display deployment summary
display_summary() {
    echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
    echo "========================"
    echo ""
    echo "Deployment Details:"
    echo "- Server: $DEPLOY_HOST"
    echo "- Path: $DEPLOY_PATH"
    echo "- PM2 App: $PM2_APP_NAME"
    echo ""
    echo "URLs:"
    echo "- Frontend: https://$DEPLOY_HOST"
    echo "- API: https://$DEPLOY_HOST/api"
    echo "- Health: https://$DEPLOY_HOST/api/health"
    echo ""
    echo "Commands:"
    echo "- View logs: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs $PM2_APP_NAME'"
    echo "- Restart: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 restart $PM2_APP_NAME'"
    echo "- Monitor: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 monit'"
    echo ""
    
    # Clean up
    rm -f deploy.tar.gz
}

# Main execution
main() {
    check_prerequisites
    run_tests
    build_application
    backup_current_deployment
    deploy_application
    reload_application
    post_deployment_checks
    display_summary
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback_deployment
        ;;
    *)
        echo "Usage: $0 [deploy|rollback]"
        exit 1
        ;;
esac