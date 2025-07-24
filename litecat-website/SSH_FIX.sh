#!/bin/bash

echo "Trying to connect to VPS from WSL..."
echo ""

# Try different SSH options
echo "Attempting connection with different options..."

# Option 1: Basic connection
echo "Try 1: Basic SSH"
ssh -o ConnectTimeout=5 root@147.93.105.138 'pm2 restart lightcat' || echo "Failed"

# Option 2: Force password auth
echo ""
echo "Try 2: Password authentication"
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@147.93.105.138 'pm2 restart lightcat' || echo "Failed"

# Option 3: Verbose mode to see what's happening
echo ""
echo "Try 3: Checking what's wrong (verbose mode)"
ssh -vv root@147.93.105.138 2>&1 | grep -E "Connection|reset|refused" | head -5

echo ""
echo "If all attempts fail, your VPS is blocking connections."
echo "Contact your VPS provider or use their web console."