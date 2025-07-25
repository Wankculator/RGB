#!/bin/bash

# Update API with enterprise features
cat > /opt/lightcat-rgb/services/api-update.js << 'UPDATE'
// Professional API Update Script

const fs = require('fs').promises;
const path = require('path');

async function updateAPI() {
    // Find API file
    const apiFile = process.argv[2];
    if (!apiFile) {
        console.error('Usage: node api-update.js <api-file-path>');
        process.exit(1);
    }
    
    console.log('Updating API:', apiFile);
    
    // Read current API
    let content = await fs.readFile(apiFile, 'utf8');
    
    // Add enterprise service
    if (!content.includes('rgbEnterpriseService')) {
        content = `const rgbEnterpriseService = require('/opt/lightcat-rgb/services/rgbEnterpriseService');\n${content}`;
    }
    
    // Add monitoring endpoints
    const monitoringEndpoints = `
// Enterprise monitoring endpoints
app.get('/api/rgb/health', async (req, res) => {
    const health = rgbEnterpriseService.lastHealthCheck || { healthy: false };
    res.json(health);
});

app.get('/api/rgb/metrics', async (req, res) => {
    const metrics = rgbEnterpriseService.metrics;
    res.json({
        success: true,
        metrics
    });
});

// Enterprise event stream
app.get('/api/rgb/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    const listener = (data) => {
        res.write(\`data: \${JSON.stringify(data)}\\n\\n\`);
    };
    
    rgbEnterpriseService.on('health', listener);
    rgbEnterpriseService.on('audit', listener);
    
    req.on('close', () => {
        rgbEnterpriseService.removeListener('health', listener);
        rgbEnterpriseService.removeListener('audit', listener);
    });
});
`;
    
    // Add before the last app.listen
    const listenIndex = content.lastIndexOf('app.listen');
    if (listenIndex > -1 && !content.includes('/api/rgb/health')) {
        content = content.slice(0, listenIndex) + monitoringEndpoints + '\n' + content.slice(listenIndex);
    }
    
    // Update consignment generation to use enterprise service
    content = content.replace(
        /rgbService\.generateConsignment/g,
        'rgbEnterpriseService.generateConsignment'
    );
    
    // Write updated API
    await fs.writeFile(apiFile, content);
    console.log('✅ API updated successfully');
}

updateAPI().catch(console.error);
UPDATE
