@echo off
echo Connecting to VPS and fixing server...
echo.

ssh root@147.93.105.138 "cd /var/www/rgblightcat && pm2 restart lightcat && sleep 3 && curl http://localhost:3000/api/health && echo. && echo Server restarted! Check http://rgblightcat.com"

echo.
echo Done! Your site should be working now.
pause