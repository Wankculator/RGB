# 🚀 Deployment Checklist for rgblightcat.com

## Server Details
- **Domain**: rgblightcat.com
- **VPS IP**: 147.93.105.138
- **Location**: Mumbai, India
- **Specs**: 2 CPU, 8GB RAM, 100GB SSD
- **OS**: Ubuntu 25.04

## Pre-Deployment Checklist

### ✅ Already Complete:
- [x] Supabase database configured
- [x] BTCPay Server set up
- [x] All tables created
- [x] Payment flow implemented
- [x] Game mechanics working
- [x] Mobile responsive design

### 📋 Before Deploying:

1. **Test Locally**
   ```bash
   # Make sure everything works
   npm run dev
   
   # Visit http://localhost:8082
   # Test game, payment flow, etc.
   ```

2. **Update Environment Variables**
   ```bash
   # Edit .env file
   # Make sure all production values are set
   nano .env
   ```

3. **Commit to Git** (Optional but recommended)
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   ```

## 🚀 Deploy to Hostinger VPS

### One Command Deployment:
```bash
./scripts/deploy-to-hostinger.sh
```

This will:
1. Package your application
2. Upload to your VPS
3. Install all dependencies
4. Configure Nginx with SSL
5. Set up PM2 process manager
6. Enable firewall
7. Make site live at https://rgblightcat.com

### Manual Deployment (if needed):

1. **SSH to your server**
   ```bash
   ssh root@147.93.105.138
   ```

2. **Run setup manually**
   ```bash
   # Download and run setup
   wget https://your-setup-url/setup.sh
   bash setup.sh
   ```

## 📊 Post-Deployment Verification

### 1. Check Services
```bash
# SSH to server
ssh root@147.93.105.138

# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Check Nginx
systemctl status nginx
```

### 2. Test Website
- Visit: https://rgblightcat.com
- Test game functionality
- Test payment flow
- Check mobile responsiveness

### 3. Monitor Performance
```bash
# Check server resources
htop

# Check disk space
df -h

# Monitor logs
pm2 logs --lines 100
```

## 🔧 Useful Commands

### On Your VPS:
```bash
# Restart application
pm2 restart all

# View real-time logs
pm2 logs --lines 100

# Check SSL certificate
certbot certificates

# Update application
cd /var/www/rgblightcat
git pull
npm install
pm2 restart all
```

### Troubleshooting:
```bash
# If site not loading
nginx -t                    # Test config
systemctl restart nginx     # Restart nginx
pm2 restart all            # Restart apps

# Check firewall
ufw status

# Check ports
netstat -tlnp
```

## 🔐 Security Reminders

1. **Change default passwords**
2. **Set up SSH keys** (disable password auth)
3. **Regular backups**
4. **Monitor logs for suspicious activity**
5. **Keep system updated**

## 📞 Support

- **Domain Issues**: Hostinger support
- **VPS Issues**: Hostinger VPS support
- **Application Issues**: Check logs first

## ✅ Final Checklist

Before going live:
- [ ] Test payment flow with small amount
- [ ] Verify email notifications work
- [ ] Check all links work
- [ ] Test on mobile devices
- [ ] Announce on social media
- [ ] Monitor first few hours

## 🎉 Ready to Deploy!

Run: `./scripts/deploy-to-hostinger.sh`

Your LIGHTCAT platform will be live at https://rgblightcat.com in about 10 minutes!