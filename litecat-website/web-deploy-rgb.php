<?php
// RGB Deployment Web Interface
// Upload this to your VPS and access via browser

$action = $_GET['action'] ?? '';
$key = $_GET['key'] ?? '';

// Simple security - change this key!
$SECRET_KEY = 'lightcat2025deploy';

if ($key !== $SECRET_KEY) {
    die('Unauthorized');
}

header('Content-Type: text/plain');

switch($action) {
    case 'fix-validation':
        echo "Fixing RGB validation...\n";
        
        // Find API file
        $apiFile = shell_exec("find /root -name 'enhanced-api*.js' -type f | grep -v backup | head -1");
        $apiFile = trim($apiFile);
        
        if (!file_exists($apiFile)) {
            die("Error: Cannot find API file\n");
        }
        
        echo "Found API at: $apiFile\n";
        
        // Backup
        $backup = $apiFile . '.backup.' . time();
        copy($apiFile, $backup);
        echo "Backup created: $backup\n";
        
        // Read file
        $content = file_get_contents($apiFile);
        
        // Check if validation exists
        if (strpos($content, "rgbInvoice.startsWith('rgb:')") !== false) {
            echo "Validation already present!\n";
        } else {
            // Add validation
            $search = 'if (!rgbInvoice || !batchCount) {
        return res.status(400).json({ error: \'Missing required fields\' });
    }';
            
            $replace = 'if (!rgbInvoice || !batchCount) {
        return res.status(400).json({ error: \'Missing required fields\' });
    }
    
    // Validate RGB invoice format
    if (!rgbInvoice.startsWith(\'rgb:\') || !rgbInvoice.includes(\'utxob:\')) {
        return res.status(400).json({ error: \'Invalid RGB invoice format. Must start with "rgb:" and contain "utxob:"\' });
    }';
            
            $content = str_replace($search, $replace, $content);
            file_put_contents($apiFile, $content);
            echo "Validation added!\n";
        }
        
        // Restart service
        shell_exec('systemctl restart lightcat-api 2>&1 || pm2 restart all 2>&1');
        echo "Service restarted!\n";
        
        // Test
        sleep(2);
        $test = shell_exec('curl -s -X POST https://rgblightcat.com/api/rgb/invoice -H "Content-Type: application/json" -d \'{"rgbInvoice": "invalid", "batchCount": 1}\'');
        if (strpos($test, 'error') !== false) {
            echo "\n✅ Validation working!\n";
        } else {
            echo "\n❌ Validation test failed\n";
        }
        break;
        
    case 'install-rgb':
        echo "Installing RGB CLI...\n";
        echo shell_exec('apt-get update 2>&1');
        echo shell_exec('apt-get install -y build-essential pkg-config libssl-dev 2>&1');
        // ... rest of installation
        echo "Installation would continue here...\n";
        break;
        
    case 'status':
        echo "System Status\n";
        echo "=============\n";
        echo "API Service: " . shell_exec('systemctl is-active lightcat-api || pm2 status');
        echo "\nValidation Test:\n";
        echo shell_exec('curl -s -X POST https://rgblightcat.com/api/rgb/invoice -H "Content-Type: application/json" -d \'{"rgbInvoice": "invalid", "batchCount": 1}\'');
        break;
        
    default:
        echo "RGB Web Deployment Interface\n";
        echo "===========================\n";
        echo "Available actions:\n";
        echo "- ?action=fix-validation&key=$SECRET_KEY\n";
        echo "- ?action=install-rgb&key=$SECRET_KEY\n";
        echo "- ?action=status&key=$SECRET_KEY\n";
}
?>