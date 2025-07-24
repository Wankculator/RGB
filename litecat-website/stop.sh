#!/bin/bash
echo "Stopping LIGHTCAT servers..."
pkill -f "node.*start-server"
pkill -f "python.*http.server.*8082"
echo "✅ Servers stopped"
