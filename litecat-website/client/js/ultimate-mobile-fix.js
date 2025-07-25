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