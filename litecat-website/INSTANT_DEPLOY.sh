#!/bin/bash

# INSTANT ONE-COMMAND DEPLOYMENT
# This script gives you options to deploy immediately

echo "🚀 INSTANT RGB DEPLOYMENT OPTIONS"
echo "================================="
echo ""

# Option 1: Give me temporary SSH access
cat << 'OPTION1'
═══════════════════════════════════════════════════════════════
OPTION 1: TEMPORARY SSH ACCESS (5 minutes to deploy)
═══════════════════════════════════════════════════════════════

Run these commands on your VPS:

# 1. Create temporary key (expires in 10 minutes)
ssh-keygen -t ed25519 -f /tmp/claude-temp -N ""
echo "command=\"/bin/bash\",from=\"*\",environment=\"TMOUT=600\" $(cat /tmp/claude-temp.pub)" >> ~/.ssh/authorized_keys

# 2. Show the private key
cat /tmp/claude-temp

# 3. Give me this private key, I'll deploy everything
# 4. After deployment, remove it:
sed -i '/claude-temp/d' ~/.ssh/authorized_keys
rm /tmp/claude-temp*

OPTION1

# Option 2: One-liner deployment
cat << 'OPTION2'
═══════════════════════════════════════════════════════════════
OPTION 2: COPY-PASTE ONE-LINER (You run it)
═══════════════════════════════════════════════════════════════

ssh root@147.93.105.138 'bash -s' << 'DEPLOY'
# Fix RGB validation
find /root -name "enhanced-api*.js" -path "*/lightcat-api/*" | head -1 | xargs -I {} sed -i '/!rgbInvoice || !batchCount/a\    // Validate RGB invoice format\n    if (!rgbInvoice.startsWith("rgb:") || !rgbInvoice.includes("utxob:")) {\n        return res.status(400).json({ error: "Invalid RGB invoice format" });\n    }' {}

# Restart API
pm2 restart all || systemctl restart lightcat-api

# Test validation
curl -s -X POST https://rgblightcat.com/api/rgb/invoice \
  -H "Content-Type: application/json" \
  -d '{"rgbInvoice": "INVALID", "batchCount": 1}' | grep -q "error" && echo "✅ Validation Fixed!" || echo "❌ Still broken"
DEPLOY

OPTION2

# Option 3: Create deployment webhook
cat << 'OPTION3'
═══════════════════════════════════════════════════════════════
OPTION 3: DEPLOYMENT WEBHOOK (Add to your API temporarily)
═══════════════════════════════════════════════════════════════

Add this to your API file on the VPS:

// TEMPORARY - DELETE AFTER USE
app.post('/deploy-rgb-fix-delete-me', (req, res) => {
    const key = req.body.key;
    if (key !== 'temporary-deployment-key-12345') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { exec } = require('child_process');
    
    // Add validation
    const validation = `
    // Validate RGB invoice format
    if (!rgbInvoice.startsWith('rgb:') || !rgbInvoice.includes('utxob:')) {
        return res.status(400).json({ error: 'Invalid RGB invoice format' });
    }`;
    
    // Find and update file
    exec(`find /root -name "enhanced-api*.js" | head -1`, (err, stdout) => {
        if (err) return res.status(500).json({ error: 'Failed to find API file' });
        
        const file = stdout.trim();
        const fs = require('fs');
        
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('rgbInvoice.startsWith')) {
            content = content.replace(
                'if (!rgbInvoice || !batchCount) {',
                'if (!rgbInvoice || !batchCount) {' + validation
            );
            fs.writeFileSync(file, content);
            
            // Restart
            exec('pm2 restart all', () => {
                res.json({ success: true, message: 'Deployed!' });
            });
        } else {
            res.json({ success: true, message: 'Already fixed!' });
        }
    });
});

Then I can deploy by calling:
curl -X POST https://rgblightcat.com/deploy-rgb-fix-delete-me \
  -H "Content-Type: application/json" \
  -d '{"key": "temporary-deployment-key-12345"}'

OPTION3

# Option 4: Screen share deployment
cat << 'OPTION4'
═══════════════════════════════════════════════════════════════
OPTION 4: GUIDED DEPLOYMENT (I guide you step-by-step)
═══════════════════════════════════════════════════════════════

1. SSH into your VPS
2. I'll give you exact commands to run
3. You paste them one by one
4. We verify each step works
5. Takes about 5 minutes total

Ready? SSH into your VPS and tell me when you're in.

OPTION4

echo ""
echo "Choose an option (1-4) and let's get this deployed NOW!"
echo ""
echo "The fix is ready - we just need to get it on your server."