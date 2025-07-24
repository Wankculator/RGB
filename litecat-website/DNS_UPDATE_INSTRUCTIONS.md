# 🌐 DNS Update Instructions for rgblightcat.com

## Current Problem:
- Your domain points to **Shared Hosting** (217.196.55.249)
- Your app is on **VPS** (147.93.105.138)
- That's why you see 403 error!

## Solution: Update DNS Records

### Step 1: Login to Hostinger
1. Go to https://hpanel.hostinger.com
2. Login with your account

### Step 2: Find Domain Management
1. Click on "Domains"
2. Find "rgblightcat.com"
3. Click "Manage"

### Step 3: Update DNS Records
1. Click on "DNS/Nameservers"
2. Delete existing A records
3. Add these new records:

```
Type: A
Name: @
Points to: 147.93.105.138
TTL: 3600

Type: A
Name: www
Points to: 147.93.105.138
TTL: 3600
```

### Step 4: Save Changes
- Click "Save"
- DNS propagation takes 5-30 minutes

## Alternative: Use Custom Nameservers

If the above doesn't work, you might need to:
1. Change nameservers from "dns-parking.com" to Hostinger's
2. Or use Cloudflare (free) for better control

## Verify DNS Change:
After 10-15 minutes, check:
```bash
# Run this on your computer
nslookup rgblightcat.com

# Should show:
# Address: 147.93.105.138
```

## Once DNS Updates:
Your site will automatically work because we already:
- ✅ Deployed the app to VPS
- ✅ Configured Nginx
- ✅ Set up PM2
- ✅ Everything is ready!

## Need Help?
- Hostinger Support can help with DNS
- Or use their live chat
- Reference: "Point domain to VPS instead of shared hosting"