#!/bin/bash

# Create monitoring dashboard
cat > /opt/lightcat-rgb/scripts/monitor.js << 'MONITOR'
const rgbService = require('../services/rgbEnterpriseService');

// Web dashboard
const express = require('express');
const app = express();

app.get('/health', async (req, res) => {
    const health = rgbService.lastHealthCheck || { healthy: false };
    const status = health.healthy ? 200 : 503;
    res.status(status).json(health);
});

app.get('/metrics', (req, res) => {
    res.json(rgbService.metrics);
});

app.listen(9090, '127.0.0.1', () => {
    console.log('Monitoring dashboard on http://localhost:9090');
});

// Console monitoring
setInterval(() => {
    const metrics = rgbService.metrics;
    console.clear();
    console.log('=== RGB Service Monitor ===');
    console.log(`Status: ${rgbService.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`Total Transactions: ${metrics.totalTransactions}`);
    console.log(`Success Rate: ${(metrics.successfulTransactions / metrics.totalTransactions * 100).toFixed(2)}%`);
    console.log(`Tokens Distributed: ${metrics.totalTokensDistributed}`);
    console.log(`Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log('========================');
}, 5000);
MONITOR

# Create systemd service for monitoring
cat > /etc/systemd/system/lightcat-monitor.service << 'SYSTEMD'
[Unit]
Description=LIGHTCAT RGB Monitoring Service
After=network.target

[Service]
Type=simple
User=lightcat
ExecStart=/usr/bin/node /opt/lightcat-rgb/scripts/monitor.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD

# Create alert script
cat > /opt/lightcat-rgb/scripts/alert.sh << 'ALERT'
#!/bin/bash

# Alert on critical events
WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
EMAIL="${ALERT_EMAIL:-}"

send_alert() {
    local level=$1
    local message=$2
    local details=$3
    
    # Log alert
    echo "[$(date)] $level: $message - $details" >> /var/log/lightcat/alerts.log
    
    # Send webhook if configured
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"level\":\"$level\",\"message\":\"$message\",\"details\":\"$details\"}"
    fi
    
    # Send email if configured
    if [ -n "$EMAIL" ]; then
        echo "$details" | mail -s "LIGHTCAT Alert: $message" "$EMAIL"
    fi
}

# Monitor service health
check_health() {
    if ! curl -s http://localhost:9090/health | grep -q '"healthy":true'; then
        send_alert "CRITICAL" "RGB Service Unhealthy" "Service health check failed"
    fi
}

# Monitor disk space
check_disk() {
    local usage=$(df /opt/lightcat-rgb | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        send_alert "WARNING" "Low Disk Space" "Disk usage at ${usage}%"
    fi
}

# Run checks
check_health
check_disk
ALERT

chmod +x /opt/lightcat-rgb/scripts/alert.sh

# Add to crontab
echo "*/5 * * * * /opt/lightcat-rgb/scripts/alert.sh" | crontab -
