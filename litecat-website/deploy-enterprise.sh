#!/bin/bash

echo "🏆 Deploying Enterprise RGB System"
echo "================================="

# Run all setup scripts
chmod +x *.sh

# 1. Create structure
./deployment-structure.sh

# 2. Fix validation
./fix-validation-advanced.sh

# 3. Install RGB CLI
if ! command -v rgb &> /dev/null; then
    echo "Installing RGB CLI..."
    # Installation commands here
fi

# 4. Copy services
cp rgbEnterpriseService.js /opt/lightcat-rgb/services/

# 5. Set up monitoring
./monitoring-setup.sh

# 6. Update API
API_FILE=$(find /root -name "enhanced-api*.js" | head -1)
if [ -n "$API_FILE" ]; then
    node /opt/lightcat-rgb/services/api-update.js "$API_FILE"
fi

# 7. Configure systemd
systemctl daemon-reload
systemctl enable lightcat-monitor
systemctl start lightcat-monitor

# 8. Set permissions
chown -R lightcat:lightcat /opt/lightcat-rgb
chmod 600 /opt/lightcat-rgb/config/*

echo "✅ Enterprise deployment complete!"
