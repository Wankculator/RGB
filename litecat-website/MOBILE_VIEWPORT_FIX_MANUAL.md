# 📱 Mobile Viewport Fix - Manual Instructions

## Overview
This fix ensures that on mobile devices, the LIVE MINT STATUS section appears below the viewport fold, requiring users to scroll down to see it.

## Server Details
- **IP**: 147.93.105.138
- **Domain**: www.rgblightcat.com
- **Client Directory**: /var/www/rgblightcat/client

## Step 1: Connect to Server
```bash
ssh root@147.93.105.138
```

## Step 2: Navigate to Client Directory
```bash
cd /var/www/rgblightcat/client
```

## Step 3: Backup Current index.html
```bash
cp index.html index.html.backup-$(date +%Y%m%d-%H%M%S)
```

## Step 4: Create JavaScript Directory (if needed)
```bash
mkdir -p js
```

## Step 5: Create viewport-mobile-fix.js
```bash
cat > js/viewport-mobile-fix.js << 'EOF'
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
```

## Step 6: Edit index.html - Add Inline CSS
Edit index.html and add this before `</head>`:

```html
<!-- mobile viewport fix inline CSS -->
<style>
@media (max-width: 768px) {
    .hero-section { min-height: calc(100vh - 80px) !important; }
    .stats-section { padding-top: 80px !important; }
}
</style>
```

## Step 7: Edit index.html - Add Script
Add this before `</body>`:

```html
    <script src="js/viewport-mobile-fix.js"></script>
```

## Step 8: Set Permissions
```bash
chown -R www-data:www-data js/viewport-mobile-fix.js
chmod 644 js/viewport-mobile-fix.js
```

## Step 9: Verify the Changes
```bash
# Check if files exist
ls -la js/viewport-mobile-fix.js

# Verify script tag was added
grep "viewport-mobile-fix.js" index.html

# Verify inline CSS was added
grep "mobile viewport fix" index.html
```

## Testing the Fix

### On Mobile Device:
1. Visit https://www.rgblightcat.com
2. The hero section should fill the entire viewport
3. LIVE MINT STATUS should only appear when you scroll down

### Using Chrome DevTools:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select various mobile devices
4. Verify the layout on different screen sizes

## Reverting Changes (if needed)
```bash
cd /var/www/rgblightcat/client
# List available backups
ls -la index.html.backup-*
# Restore from backup (use your backup filename)
mv index.html.backup-YYYYMMDD-HHMMSS index.html
```

## Expected Result
- **Desktop**: No changes, everything works as before
- **Tablet (768px and below)**: Hero section fills viewport, stats below
- **Mobile (480px and below)**: Hero section slightly smaller, more padding for stats

## Troubleshooting

### If changes don't appear:
1. Clear browser cache
2. Try incognito/private mode
3. Check nginx cache settings

### If layout breaks:
1. Restore from backup
2. Check for CSS conflicts in index.html
3. Verify JavaScript console for errors