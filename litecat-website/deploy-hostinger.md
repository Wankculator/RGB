# Hostinger Deployment Guide for Litecat Website

## OPTION 1: Shared Hosting Deployment (Recommended for Beginners)

### What You'll Upload:
- All files from the `client` folder
- A simple PHP backend for handling payments

### Step-by-Step Instructions:

#### 1. Prepare Files on Your Computer
1. Open File Explorer
2. Navigate to: `C:\Users\sk84l\Downloads\RGB LIGHT CAT\litecat-website\client`
3. Select ALL files in the client folder:
   - index.html
   - setup.html
   - litecat-game.js
   - logo.jpg
   - LIGHTING_BOT.png
   - scripts folder
   - styles folder

#### 2. Login to Hostinger
1. Go to https://www.hostinger.com
2. Login with your credentials
3. Click "Hosting" in the top menu
4. Click "Manage" on your hosting plan

#### 3. Upload Files Using File Manager
1. Click "File Manager" in the hosting dashboard
2. Navigate to the `public_html` folder
3. Delete any existing index.html
4. Click "Upload Files" button
5. Drag and drop ALL the files from step 1
6. Wait for upload to complete

#### 4. Create API Handler
Since shared hosting doesn't support Node.js, create a simple PHP file:

1. In File Manager, click "New File"
2. Name it: `api.php`
3. Add this content:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Your Bitcoin wallet address
$BTC_WALLET = 'bc1qjzzlcqhfxd745qmfdtd2vs2eggz935s5hx32fm';

// Handle API requests
$action = $_GET['action'] ?? '';

switch($action) {
    case 'create-invoice':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Generate unique invoice ID
        $invoiceId = uniqid('litecat_');
        
        // Calculate amounts
        $batchCount = intval($data['batchCount']);
        $totalSats = $batchCount * 2000;
        $totalBTC = $totalSats / 100000000;
        
        echo json_encode([
            'invoiceId' => $invoiceId,
            'paymentAddress' => $BTC_WALLET,
            'amount' => $totalSats,
            'amountBTC' => $totalBTC,
            'batchCount' => $batchCount,
            'totalTokens' => $batchCount * 700,
            'status' => 'pending'
        ]);
        break;
        
    case 'stats':
        // Mock stats for display
        echo json_encode([
            'totalBatches' => 28500,
            'batchesSold' => 1250,
            'batchesRemaining' => 27250,
            'tokensSold' => 875000,
            'salesProgress' => 4.38
        ]);
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action']);
}
?>
```

#### 5. Update JavaScript to Use PHP API
1. Create a new file called `config.js` in the scripts folder:

```javascript
// API Configuration for Hostinger
window.API_BASE_URL = '/api.php';
window.BTC_WALLET = 'bc1qjzzlcqhfxd745qmfdtd2vs2eggz935s5hx32fm';
```

#### 6. Update Your Domain Settings
1. In Hostinger dashboard, go to "Domains"
2. Make sure your domain points to your hosting
3. Enable SSL certificate (free with Hostinger)

#### 7. Test Your Website
1. Visit your domain: https://yourdomain.com
2. Check that the game works
3. Test the purchase flow

---

## OPTION 2: VPS Hosting Deployment (For Full Node.js App)

### Prerequisites:
- VPS hosting plan with Hostinger
- SSH access enabled
- Node.js support

### Step 1: Connect via SSH
```bash
ssh root@your-server-ip
```

### Step 2: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Step 4: Upload Your Files
Use FileZilla or SCP:
```bash
scp -r /path/to/litecat-website root@your-server-ip:/var/www/
```

### Step 5: Install Dependencies
```bash
cd /var/www/litecat-website
npm install
```

### Step 6: Create Production .env
```bash
nano .env
```

Add your production environment variables:
```env
NODE_ENV=production
PORT=3000
SERVER_URL=https://yourdomain.com
# ... rest of your config
```

### Step 7: Start with PM2
```bash
pm2 start server/app.js --name litecat
pm2 save
pm2 startup
```

### Step 8: Setup Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/litecat
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/litecat /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Setup SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Post-Deployment Checklist:
- [ ] Website loads correctly
- [ ] Game functions properly
- [ ] Lightning animations work
- [ ] Payment address displays correctly
- [ ] SSL certificate is active (https://)
- [ ] Mobile responsive design works

## Troubleshooting:
- **White screen**: Check browser console for errors
- **Game not loading**: Ensure litecat-game.js uploaded
- **Images missing**: Check file paths and names
- **Payment not working**: Verify API endpoint URLs

## Support:
- Hostinger Support: https://www.hostinger.com/support
- Check error logs in Hostinger panel