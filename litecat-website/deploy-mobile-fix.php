<?php
/**
 * Mobile Fix Deployment Script for LIGHTCAT
 * Upload this file to the server and access it via browser to deploy the fix
 */

// Security check - you should remove this file after deployment
$auth_token = 'lightcat-mobile-fix-2025';
if (!isset($_GET['token']) || $_GET['token'] !== $auth_token) {
    die('Unauthorized. Use ?token=' . $auth_token);
}

// Configuration
$base_dir = '/var/www/rgblightcat';
$css_dir = $base_dir . '/client/css';
$js_dir = $base_dir . '/client/js';
$index_file = $base_dir . '/client/index.html';

// CSS content
$css_content = '/* Ultimate Mobile Fix for LIGHTCAT - Ensures LIVE MINT STATUS is visible */
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
}';

// JS content
$js_content = '// Ultimate Mobile Fix for LIGHTCAT - Dynamic adjustments
(function() {
    \'use strict\';
    
    // Function to check if we\'re on mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Function to fix mobile layout
    function fixMobileLayout() {
        if (!isMobile()) return;
        
        console.log(\'Applying mobile fixes...\');
        
        // Get elements
        const header = document.querySelector(\'header\');
        const statsSection = document.querySelector(\'.stats-section\');
        const sectionTitle = document.querySelector(\'.stats-section .section-title\');
        const progressText = document.getElementById(\'progressText\');
        
        // Fix header
        if (header) {
            header.style.position = \'fixed\';
            header.style.top = \'0\';
            header.style.left = \'0\';
            header.style.right = \'0\';
            header.style.zIndex = \'9999\';
            header.style.maxHeight = \'80px\';
            
            // Calculate actual header height
            const headerHeight = header.offsetHeight;
            document.body.style.paddingTop = headerHeight + \'px\';
            
            console.log(\'Header fixed with height:\', headerHeight);
        }
        
        // Fix stats section
        if (statsSection) {
            // Ensure it\'s pushed down enough
            statsSection.style.paddingTop = \'300px\';
            statsSection.style.marginTop = \'0\';
            statsSection.style.background = \'#000\';
            statsSection.style.position = \'relative\';
            statsSection.style.zIndex = \'1\';
            
            console.log(\'Stats section padding applied\');
        }
        
        // Ensure title is visible
        if (sectionTitle) {
            sectionTitle.style.display = \'block\';
            sectionTitle.style.opacity = \'1\';
            sectionTitle.style.visibility = \'visible\';
            sectionTitle.style.fontSize = \'2rem\';
            sectionTitle.style.color = \'#FFD700\';
            sectionTitle.style.textAlign = \'center\';
            sectionTitle.style.marginBottom = \'2rem\';
            
            // Make sure the text is there
            if (!sectionTitle.textContent || sectionTitle.textContent.trim() === \'\') {
                sectionTitle.textContent = \'LIVE MINT STATUS\';
            }
            
            console.log(\'Section title made visible:\', sectionTitle.textContent);
        }
        
        // Ensure progress text is visible
        if (progressText) {
            progressText.style.display = \'block\';
            progressText.style.opacity = \'1\';
            progressText.style.visibility = \'visible\';
            
            console.log(\'Progress text made visible\');
        }
        
        // Additional check for viewport
        const viewport = document.querySelector(\'meta[name="viewport"]\');
        if (!viewport) {
            const meta = document.createElement(\'meta\');
            meta.name = \'viewport\';
            meta.content = \'width=device-width, initial-scale=1, maximum-scale=1\';
            document.head.appendChild(meta);
            console.log(\'Viewport meta tag added\');
        }
    }
    
    // Apply fixes on load
    window.addEventListener(\'load\', fixMobileLayout);
    
    // Apply fixes on resize
    let resizeTimeout;
    window.addEventListener(\'resize\', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(fixMobileLayout, 250);
    });
    
    // Apply fixes immediately if DOM is ready
    if (document.readyState === \'complete\' || document.readyState === \'interactive\') {
        setTimeout(fixMobileLayout, 100);
    }
    
    // Debug function to check visibility
    window.checkMobileVisibility = function() {
        const statsSection = document.querySelector(\'.stats-section\');
        const sectionTitle = document.querySelector(\'.stats-section .section-title\');
        
        console.log(\'Mobile check:\', {
            isMobile: isMobile(),
            statsSectionExists: !!statsSection,
            statsPaddingTop: statsSection ? statsSection.style.paddingTop : \'N/A\',
            titleExists: !!sectionTitle,
            titleVisible: sectionTitle ? window.getComputedStyle(sectionTitle).display !== \'none\' : false,
            titleText: sectionTitle ? sectionTitle.textContent : \'N/A\'
        });
    };
    
    console.log(\'Ultimate mobile fix loaded\');
})();';

// Function to deploy files
function deployMobileFix() {
    global $css_dir, $js_dir, $index_file, $css_content, $js_content;
    
    $results = [];
    
    // Create directories if they don't exist
    if (!is_dir($css_dir)) {
        mkdir($css_dir, 0755, true);
    }
    if (!is_dir($js_dir)) {
        mkdir($js_dir, 0755, true);
    }
    
    // Deploy CSS file
    $css_file = $css_dir . '/ultimate-mobile-fix.css';
    if (file_put_contents($css_file, $css_content) !== false) {
        $results[] = "✅ CSS file created: $css_file";
    } else {
        $results[] = "❌ Failed to create CSS file";
    }
    
    // Deploy JS file
    $js_file = $js_dir . '/ultimate-mobile-fix.js';
    if (file_put_contents($js_file, $js_content) !== false) {
        $results[] = "✅ JS file created: $js_file";
    } else {
        $results[] = "❌ Failed to create JS file";
    }
    
    // Update index.html
    if (file_exists($index_file)) {
        $html_content = file_get_contents($index_file);
        
        // Backup
        file_put_contents($index_file . '.backup-mobile-fix', $html_content);
        $results[] = "✅ Backup created: $index_file.backup-mobile-fix";
        
        // Add CSS reference if not exists
        if (strpos($html_content, 'ultimate-mobile-fix.css') === false) {
            $html_content = str_replace('</head>', '    <link rel="stylesheet" href="css/ultimate-mobile-fix.css">' . PHP_EOL . '</head>', $html_content);
            $results[] = "✅ Added CSS reference to index.html";
        } else {
            $results[] = "ℹ️  CSS reference already exists in index.html";
        }
        
        // Add JS reference if not exists
        if (strpos($html_content, 'ultimate-mobile-fix.js') === false) {
            $html_content = str_replace('</body>', '    <script src="js/ultimate-mobile-fix.js"></script>' . PHP_EOL . '</body>', $html_content);
            $results[] = "✅ Added JS reference to index.html";
        } else {
            $results[] = "ℹ️  JS reference already exists in index.html";
        }
        
        // Save updated index.html
        if (file_put_contents($index_file, $html_content) !== false) {
            $results[] = "✅ Updated index.html successfully";
        } else {
            $results[] = "❌ Failed to update index.html";
        }
    } else {
        $results[] = "❌ index.html not found at: $index_file";
    }
    
    // Try to restart services
    $pm2_result = shell_exec('pm2 restart lightcat-ui 2>&1');
    if ($pm2_result) {
        $results[] = "✅ PM2 restart attempted: " . substr($pm2_result, 0, 100);
    }
    
    $nginx_result = shell_exec('systemctl reload nginx 2>&1');
    if ($nginx_result) {
        $results[] = "✅ Nginx reload attempted: " . substr($nginx_result, 0, 100);
    }
    
    return $results;
}

// Execute deployment
$results = deployMobileFix();

?>
<!DOCTYPE html>
<html>
<head>
    <title>LIGHTCAT Mobile Fix Deployment</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: #fff;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #FFD700;
            border-bottom: 2px solid #FFD700;
            padding-bottom: 10px;
        }
        .result {
            background: #2a2a2a;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid #4CAF50;
        }
        .error {
            border-left-color: #f44336;
        }
        .warning {
            border-left-color: #ff9800;
        }
        .success {
            color: #4CAF50;
        }
        .instructions {
            background: #333;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
        }
        code {
            background: #444;
            padding: 2px 5px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <h1>📱 LIGHTCAT Mobile Fix Deployment</h1>
    
    <h2>Deployment Results:</h2>
    <?php foreach ($results as $result): ?>
        <div class="result <?php echo strpos($result, '❌') !== false ? 'error' : ''; ?>">
            <?php echo $result; ?>
        </div>
    <?php endforeach; ?>
    
    <div class="instructions">
        <h2>Next Steps:</h2>
        <ol>
            <li>Visit <a href="https://rgblightcat.com" target="_blank">https://rgblightcat.com</a> on a mobile device</li>
            <li>Check if the LIVE MINT STATUS section is visible below the header</li>
            <li>Open browser console and look for "Ultimate mobile fix loaded" message</li>
            <li>If needed, run in console: <code>checkMobileVisibility()</code></li>
        </ol>
        
        <h3>⚠️ Security Notice:</h3>
        <p>DELETE THIS FILE after deployment is complete!</p>
        <code>rm <?php echo __FILE__; ?></code>
    </div>
</body>
</html>