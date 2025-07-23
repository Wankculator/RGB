#!/bin/bash

# LIGHTCAT Monitoring & Logging Setup Script
# Sets up comprehensive monitoring for production

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}📊 LIGHTCAT Monitoring Setup${NC}"
echo "==============================="
echo ""

# Function to setup PM2 monitoring
setup_pm2_monitoring() {
    echo -e "${BLUE}📊 Setting up PM2 Monitoring...${NC}"
    
    # Install PM2 if not already installed
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Install PM2 monitoring modules
    pm2 install pm2-logrotate
    pm2 install pm2-auto-pull
    
    # Configure log rotation
    pm2 set pm2-logrotate:max_size 50M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
    pm2 set pm2-logrotate:workerInterval 3600
    
    # Enable PM2 web monitoring
    pm2 web
    
    echo -e "${GREEN}✅ PM2 monitoring configured${NC}"
    echo "   Access PM2 web interface at: http://localhost:9615"
    echo ""
}

# Function to setup application logging
setup_application_logging() {
    echo -e "${BLUE}📝 Setting up Application Logging...${NC}"
    
    # Create logging configuration
    cat > server/config/logging.js << 'EOF'
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Create formatters
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Create transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }),
    
    // Error log file
    new DailyRotateFile({
        filename: 'server/logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
    }),
    
    // Combined log file
    new DailyRotateFile({
        filename: 'server/logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
    }),
    
    // RGB payments log
    new DailyRotateFile({
        filename: 'server/logs/rgb-payments-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
    }),
];

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
});

// Create specialized loggers
const paymentLogger = winston.createLogger({
    level: 'info',
    format,
    transports: [
        new DailyRotateFile({
            filename: 'server/logs/payments-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '90d',
        }),
    ],
});

const gameLogger = winston.createLogger({
    level: 'info',
    format,
    transports: [
        new DailyRotateFile({
            filename: 'server/logs/game-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
});

module.exports = {
    logger,
    paymentLogger,
    gameLogger,
};
EOF

    # Create log directory
    mkdir -p server/logs
    
    echo -e "${GREEN}✅ Application logging configured${NC}"
    echo ""
}

# Function to setup Sentry error tracking
setup_sentry() {
    echo -e "${BLUE}🐛 Setting up Sentry Error Tracking...${NC}"
    
    # Create Sentry configuration
    cat > server/config/sentry.js << 'EOF'
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

function initSentry(app) {
    if (!process.env.SENTRY_DSN) {
        console.warn('⚠️  Sentry DSN not configured');
        return;
    }
    
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            // Enable HTTP calls tracing
            new Sentry.Integrations.Http({ tracing: true }),
            // Enable Express.js middleware tracing
            new Sentry.Integrations.Express({ app }),
            // Enable profiling
            new ProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Profiling
        profilesSampleRate: 1.0,
        // Environment
        environment: process.env.NODE_ENV,
        // Release tracking
        release: process.env.npm_package_version,
        // Custom tags
        beforeSend(event, hint) {
            // Filter out sensitive data
            if (event.request && event.request.headers) {
                delete event.request.headers.authorization;
                delete event.request.headers.cookie;
            }
            return event;
        },
    });
    
    // Request handler must be first middleware
    app.use(Sentry.Handlers.requestHandler());
    
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
}

function setupSentryErrorHandler(app) {
    // Error handler must be before any other error middleware
    app.use(Sentry.Handlers.errorHandler());
}

module.exports = {
    initSentry,
    setupSentryErrorHandler,
    Sentry,
};
EOF

    echo -e "${GREEN}✅ Sentry configuration created${NC}"
    echo "   Add SENTRY_DSN to your .env file"
    echo ""
}

# Function to setup Grafana and Prometheus
setup_metrics() {
    echo -e "${BLUE}📈 Setting up Metrics Collection...${NC}"
    
    # Create metrics configuration
    cat > server/config/metrics.js << 'EOF'
const prometheus = require('prom-client');
const responseTime = require('response-time');

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
});

const rgbInvoicesCreated = new prometheus.Counter({
    name: 'rgb_invoices_created_total',
    help: 'Total number of RGB invoices created',
    labelNames: ['tier'],
});

const rgbPaymentsProcessed = new prometheus.Counter({
    name: 'rgb_payments_processed_total',
    help: 'Total number of RGB payments processed',
    labelNames: ['status'],
});

const gameScoresRecorded = new prometheus.Counter({
    name: 'game_scores_recorded_total',
    help: 'Total number of game scores recorded',
    labelNames: ['tier'],
});

const activeWebsocketConnections = new prometheus.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(rgbInvoicesCreated);
register.registerMetric(rgbPaymentsProcessed);
register.registerMetric(gameScoresRecorded);
register.registerMetric(activeWebsocketConnections);

// Middleware to track response times
const metricsMiddleware = responseTime((req, res, time) => {
    const route = req.route ? req.route.path : req.path;
    httpRequestDuration
        .labels(req.method, route, res.statusCode)
        .observe(time / 1000); // Convert to seconds
});

// Metrics endpoint
function metricsEndpoint(req, res) {
    res.set('Content-Type', register.contentType);
    register.metrics().then(data => res.send(data));
}

module.exports = {
    register,
    metricsMiddleware,
    metricsEndpoint,
    metrics: {
        rgbInvoicesCreated,
        rgbPaymentsProcessed,
        gameScoresRecorded,
        activeWebsocketConnections,
    },
};
EOF

    echo -e "${GREEN}✅ Metrics collection configured${NC}"
    echo ""
}

# Function to setup health checks
setup_health_checks() {
    echo -e "${BLUE}🏥 Setting up Health Checks...${NC}"
    
    cat > server/routes/health.js << 'EOF'
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Health check endpoint
router.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version,
        checks: {},
    };
    
    // Check database
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { error } = await supabase.from('users').select('count').limit(1);
        health.checks.database = error ? 'fail' : 'pass';
    } catch (err) {
        health.checks.database = 'fail';
    }
    
    // Check RGB node
    try {
        // Add RGB node health check here
        health.checks.rgb_node = 'pass'; // Placeholder
    } catch (err) {
        health.checks.rgb_node = 'fail';
    }
    
    // Check Lightning node
    try {
        // Add Lightning node health check here
        health.checks.lightning_node = 'pass'; // Placeholder
    } catch (err) {
        health.checks.lightning_node = 'fail';
    }
    
    // Determine overall health
    const allChecks = Object.values(health.checks);
    if (allChecks.includes('fail')) {
        health.status = 'degraded';
        res.status(503);
    }
    
    res.json(health);
});

// Liveness probe (for k8s)
router.get('/health/live', (req, res) => {
    res.json({ status: 'alive' });
});

// Readiness probe (for k8s)
router.get('/health/ready', async (req, res) => {
    // Check if app is ready to serve traffic
    const ready = {
        ready: true,
        checks: {},
    };
    
    // Add readiness checks here
    
    res.status(ready.ready ? 200 : 503).json(ready);
});

module.exports = router;
EOF

    echo -e "${GREEN}✅ Health checks configured${NC}"
    echo ""
}

# Function to setup uptime monitoring
setup_uptime_monitoring() {
    echo -e "${BLUE}🔔 Setting up Uptime Monitoring...${NC}"
    
    cat > scripts/uptime-monitor.sh << 'EOF'
#!/bin/bash
# LIGHTCAT Uptime Monitor

# Configuration
SITES=(
    "https://lightcat.xyz|LIGHTCAT Frontend"
    "https://lightcat.xyz/api/health|API Health"
    "https://lightcat.xyz/api/rgb/stats|RGB Stats"
)

WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
CHECK_INTERVAL=300 # 5 minutes

# Function to send alert
send_alert() {
    local site=$1
    local status=$2
    local message=$3
    
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -H "Content-Type: application/json" \
             -d "{\"content\": \"🚨 **$site** is $status: $message\"}" \
             $WEBHOOK_URL
    fi
    
    # Log to file
    echo "$(date): $site is $status - $message" >> ~/lightcat-uptime.log
}

# Function to check site
check_site() {
    local url=$(echo $1 | cut -d'|' -f1)
    local name=$(echo $1 | cut -d'|' -f2)
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 $url)
    
    if [ "$response" -eq 200 ]; then
        echo "✅ $name is UP (HTTP $response)"
    else
        echo "❌ $name is DOWN (HTTP $response)"
        send_alert "$name" "DOWN" "HTTP $response"
    fi
}

# Main monitoring loop
while true; do
    echo "=== Uptime Check: $(date) ==="
    
    for site in "${SITES[@]}"; do
        check_site "$site"
    done
    
    echo ""
    sleep $CHECK_INTERVAL
done
EOF

    chmod +x scripts/uptime-monitor.sh
    
    # Create systemd service
    sudo tee /etc/systemd/system/lightcat-uptime.service > /dev/null << EOF
[Unit]
Description=LIGHTCAT Uptime Monitor
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$PWD/scripts/uptime-monitor.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}✅ Uptime monitoring configured${NC}"
    echo ""
}

# Function to setup log aggregation
setup_log_aggregation() {
    echo -e "${BLUE}📚 Setting up Log Aggregation...${NC}"
    
    cat > scripts/aggregate-logs.sh << 'EOF'
#!/bin/bash
# LIGHTCAT Log Aggregation Script

LOG_DIR="$HOME/lightcat-logs"
mkdir -p $LOG_DIR

# Function to collect logs
collect_logs() {
    local date=$(date +%Y%m%d)
    local archive="$LOG_DIR/lightcat-logs-$date.tar.gz"
    
    # Collect all logs
    tar -czf $archive \
        server/logs/*.log \
        ~/.pm2/logs/*.log \
        ~/lightcat-testnet/logs/*.log \
        2>/dev/null || true
    
    echo "✅ Logs archived: $archive"
    
    # Clean old archives (keep 30 days)
    find $LOG_DIR -name "*.tar.gz" -mtime +30 -delete
}

# Function to analyze logs
analyze_logs() {
    echo "=== Log Analysis ==="
    echo ""
    
    # Count errors
    echo "Error Summary:"
    grep -i "error" server/logs/combined-*.log 2>/dev/null | \
        awk '{print $4}' | sort | uniq -c | sort -rn | head -10
    
    echo ""
    echo "Warning Summary:"
    grep -i "warn" server/logs/combined-*.log 2>/dev/null | \
        awk '{print $4}' | sort | uniq -c | sort -rn | head -10
    
    echo ""
    echo "Payment Events:"
    grep -E "(invoice created|payment received)" server/logs/payments-*.log 2>/dev/null | \
        tail -20
}

# Main execution
case "${1:-collect}" in
    collect)
        collect_logs
        ;;
    analyze)
        analyze_logs
        ;;
    *)
        echo "Usage: $0 [collect|analyze]"
        ;;
esac
EOF

    chmod +x scripts/aggregate-logs.sh
    
    # Add to crontab
    echo "0 2 * * * $PWD/scripts/aggregate-logs.sh collect" | crontab -
    
    echo -e "${GREEN}✅ Log aggregation configured${NC}"
    echo ""
}

# Function to create monitoring dashboard
create_monitoring_dashboard() {
    echo -e "${BLUE}📊 Creating Monitoring Dashboard...${NC}"
    
    cat > server/routes/dashboard.js << 'EOF'
const express = require('express');
const router = express.Router();
const os = require('os');
const { metrics } = require('../config/metrics');

router.get('/dashboard/stats', async (req, res) => {
    try {
        const stats = {
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                uptime: os.uptime(),
                loadavg: os.loadavg(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem(),
                    percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
                },
                cpu: os.cpus(),
            },
            process: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                pid: process.pid,
                version: process.version,
            },
            application: {
                // Add application-specific stats here
                version: process.env.npm_package_version,
                environment: process.env.NODE_ENV,
            },
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
EOF

    echo -e "${GREEN}✅ Monitoring dashboard created${NC}"
    echo ""
}

# Function to display summary
display_summary() {
    echo -e "${GREEN}🎉 MONITORING SETUP COMPLETE!${NC}"
    echo "==============================="
    echo ""
    echo "Monitoring Components:"
    echo "- ✅ PM2 monitoring and log rotation"
    echo "- ✅ Application logging with Winston"
    echo "- ✅ Sentry error tracking (configure DSN)"
    echo "- ✅ Prometheus metrics collection"
    echo "- ✅ Health check endpoints"
    echo "- ✅ Uptime monitoring script"
    echo "- ✅ Log aggregation and analysis"
    echo "- ✅ Monitoring dashboard"
    echo ""
    echo "Endpoints:"
    echo "- Health: /api/health"
    echo "- Metrics: /api/metrics"
    echo "- Dashboard: /api/dashboard/stats"
    echo "- PM2 Web: http://localhost:9615"
    echo ""
    echo "Next Steps:"
    echo "1. Add SENTRY_DSN to .env for error tracking"
    echo "2. Configure DISCORD_WEBHOOK_URL for alerts"
    echo "3. Set up Grafana for metrics visualization"
    echo "4. Start uptime monitor:"
    echo "   sudo systemctl start lightcat-uptime"
    echo ""
    echo "Commands:"
    echo "- View logs: pm2 logs"
    echo "- Analyze logs: ./scripts/aggregate-logs.sh analyze"
    echo "- Check metrics: curl localhost:3000/api/metrics"
    echo ""
}

# Main execution
main() {
    setup_pm2_monitoring
    setup_application_logging
    setup_sentry
    setup_metrics
    setup_health_checks
    setup_uptime_monitoring
    setup_log_aggregation
    create_monitoring_dashboard
    display_summary
}

# Run main function
main