#!/bin/bash
# Mobile Fix Deployment Script
# Run this on the server if automatic deployment fails

cd /var/www/rgblightcat

# Create CSS file
cat > client/css/ultimate-mobile-fix.css << 'EOF'
/* Ultimate Mobile Fix for LIGHTCAT - Ensures LIVE MINT STATUS is visible */
@media screen and (max-width: 768px) {
    /* Fix header positioning */
    header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9999 !important;
        max-height: 80px !important;
        background: rgba(0, 0, 0, 0.95) !important;
        backdrop-filter: blur(10px) !important;
    }
    
    /* Add padding to body to account for fixed header */
    body {
        padding-top: 80px !important;
    }
    
    /* Push stats section down significantly to ensure visibility */
    .stats-section {
        padding-top: 300px !important;
        margin-top: 0 !important;
        background: #000 !important;
        position: relative !important;
        z-index: 1 !important;
    }
    
    /* Ensure section title is visible */
    .stats-section .section-title {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        font-size: 2rem !important;
        color: #FFD700 !important;
        text-align: center !important;
        margin-bottom: 2rem !important;
        text-transform: uppercase !important;
        letter-spacing: 2px !important;
    }
    
    /* Ensure progress text is visible */
    #progressText {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        font-size: 1.1rem !important;
        color: #fff !important;
        text-align: center !important;
        margin-bottom: 1rem !important;
    }
    
    /* Fix stat cards layout */
    .stats-container {
        padding: 1rem !important;
    }
    
    .stat-card {
        margin-bottom: 1rem !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 215, 0, 0.3) !important;
        padding: 1.5rem !important;
    }
    
    /* Ensure everything else flows properly */
    .hero-section {
        min-height: auto !important;
        padding-bottom: 2rem !important;
    }
    
    /* Fix any overlapping issues */
    * {
        position: relative !important;
    }
    
    header, header * {
        position: fixed !important;
    }
}

/* Additional mobile optimizations */
@media screen and (max-width: 480px) {
    .stats-section {
        padding-top: 320px !important;
    }
    
    .stats-section .section-title {
        font-size: 1.5rem !important;
    }
}
EOF

# Create JS file
cat > client/js/ultimate-mobile-fix.js << 'EOF'
// Ultimate Mobile Fix for LIGHTCAT - Dynamic adjustments
(function() {
    'use strict';
    
    // Function to check if we're on mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Function to fix mobile layout
    function fixMobileLayout() {
        if (!isMobile()) return;
        
        console.log('Applying mobile fixes...');
        
        // Get elements
        const header = document.querySelector('header');
        const statsSection = document.querySelector('.stats-section');
        const sectionTitle = document.querySelector('.stats-section .section-title');
        const progressText = document.getElementById('progressText');
        
        // Fix header
        if (header) {
            header.style.position = 'fixed';
            header.style.top = '0';
            header.style.left = '0';
            header.style.right = '0';
            header.style.zIndex = '9999';
            header.style.maxHeight = '80px';
            
            // Calculate actual header height
            const headerHeight = header.offsetHeight;
            document.body.style.paddingTop = headerHeight + 'px';
            
            console.log('Header fixed with height:', headerHeight);
        }
        
        // Fix stats section
        if (statsSection) {
            // Ensure it's pushed down enough
            statsSection.style.paddingTop = '300px';
            statsSection.style.marginTop = '0';
            statsSection.style.background = '#000';
            statsSection.style.position = 'relative';
            statsSection.style.zIndex = '1';
            
            console.log('Stats section padding applied');
        }
        
        // Ensure title is visible
        if (sectionTitle) {
            sectionTitle.style.display = 'block';
            sectionTitle.style.opacity = '1';
            sectionTitle.style.visibility = 'visible';
            sectionTitle.style.fontSize = '2rem';
            sectionTitle.style.color = '#FFD700';
            sectionTitle.style.textAlign = 'center';
            sectionTitle.style.marginBottom = '2rem';
            
            // Make sure the text is there
            if (!sectionTitle.textContent || sectionTitle.textContent.trim() === '') {
                sectionTitle.textContent = 'LIVE MINT STATUS';
            }
            
            console.log('Section title made visible:', sectionTitle.textContent);
        }
        
        // Ensure progress text is visible
        if (progressText) {
            progressText.style.display = 'block';
            progressText.style.opacity = '1';
            progressText.style.visibility = 'visible';
            
            console.log('Progress text made visible');
        }
        
        // Additional check for viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1, maximum-scale=1';
            document.head.appendChild(meta);
            console.log('Viewport meta tag added');
        }
    }
    
    // Apply fixes on load
    window.addEventListener('load', fixMobileLayout);
    
    // Apply fixes on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(fixMobileLayout, 250);
    });
    
    // Apply fixes immediately if DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fixMobileLayout, 100);
    }
    
    // Debug function to check visibility
    window.checkMobileVisibility = function() {
        const statsSection = document.querySelector('.stats-section');
        const sectionTitle = document.querySelector('.stats-section .section-title');
        
        console.log('Mobile check:', {
            isMobile: isMobile(),
            statsSectionExists: !!statsSection,
            statsPaddingTop: statsSection ? statsSection.style.paddingTop : 'N/A',
            titleExists: !!sectionTitle,
            titleVisible: sectionTitle ? window.getComputedStyle(sectionTitle).display !== 'none' : false,
            titleText: sectionTitle ? sectionTitle.textContent : 'N/A'
        });
    };
    
    console.log('Ultimate mobile fix loaded');
})();
EOF

# Update index.html
cp client/index.html client/index.html.backup-mobile-fix

# Add CSS reference if not exists
grep -q "ultimate-mobile-fix.css" client/index.html || sed -i '/<\/head>/i \    <link rel="stylesheet" href="css/ultimate-mobile-fix.css">' client/index.html

# Add JS reference if not exists
grep -q "ultimate-mobile-fix.js" client/index.html || sed -i '/<\/body>/i \    <script src="js/ultimate-mobile-fix.js"></script>' client/index.html

# Restart services
pm2 restart lightcat-ui
systemctl reload nginx

echo "Mobile fix deployed successfully!"
