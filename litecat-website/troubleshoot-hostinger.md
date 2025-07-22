# Hostinger Troubleshooting Guide

## Quick Checks First:

### 1. Check Your Domain Status
- What is your domain name?
- Did you just set it up? (DNS can take 24-48 hours)
- Try accessing with: 
  - `http://yourdomain.com`
  - `https://yourdomain.com`
  - `http://www.yourdomain.com`

### 2. Check File Location
In Hostinger File Manager, verify:
- Are your files in `public_html` folder?
- Is `index.html` directly in `public_html`?
- NOT in `public_html/litecat-website/client/`

### 3. Common Issues & Fixes:

#### Issue: "Index of /" or directory listing shown
**Fix:** Your index.html is not in the right place
1. In File Manager, check that index.html is in `public_html`
2. If it's in a subfolder, move it to `public_html`

#### Issue: 404 Not Found
**Fix:** Domain not pointing correctly
1. Go to Hostinger → Domains
2. Check "DNS Zone"
3. Should have A record pointing to your hosting IP

#### Issue: White/Blank Page
**Fix:** JavaScript errors
1. Open browser (Chrome/Edge)
2. Press F12 for Developer Tools
3. Click "Console" tab
4. Look for red error messages
5. Share the errors with me

#### Issue: "This site can't be reached"
**Fix:** DNS not propagated yet
1. Wait 2-24 hours for DNS
2. Try using your Hostinger temporary URL
3. In Hostinger dashboard, look for temporary URL like:
   - `http://yourdomain.x10.bz`
   - `http://server123.hostinger.com/~username`

## Let's Check Your Setup:

### Please tell me:
1. **Your domain name** (I'll check if it's live)
2. **What error you see** (exact message)
3. **Your file structure** in File Manager looks like:
   ```
   public_html/
   ├── index.html ← Should be here
   ├── setup.html
   ├── litecat-game.js
   ├── logo.jpg
   ├── LIGHTING_BOT.png
   ├── simple-api.js
   ├── scripts/
   │   └── app.js
   └── styles/
       └── main.css
   ```

### Quick Test Commands (if you have SSH):
```bash
# Check if files are in right place
ls -la /home/username/public_html/

# Check file permissions
chmod 644 /home/username/public_html/index.html
chmod 755 /home/username/public_html/
```

### If Using cPanel File Manager:
1. Right-click on `index.html`
2. Select "Change Permissions"
3. Set to 644 (rw-r--r--)
4. Click "Save"

## Share This Info With Me:
1. Screenshot of your File Manager showing public_html contents
2. Your domain name
3. Any error messages you see
4. Browser console errors (F12 → Console)

I'll help you fix it!