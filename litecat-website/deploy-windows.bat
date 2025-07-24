@echo off
echo ========================================
echo   LIGHTCAT Deployment to Hostinger
echo   Domain: rgblightcat.com
echo ========================================
echo.

echo This will deploy your platform to production.
echo.
set /p confirm=Continue? (y/n): 

if /i "%confirm%" neq "y" (
    echo Deployment cancelled.
    pause
    exit
)

echo.
echo Starting WSL deployment...
wsl -e bash -c "cd /mnt/c/Users/sk84l/Downloads/'RGB LIGHT CAT'/litecat-website && ./scripts/deploy-to-hostinger.sh"

echo.
echo Deployment process started!
pause