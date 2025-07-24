#!/bin/bash
pkill -f "node.*simple-api" 2>/dev/null
pkill -f "node.*serve-ui" 2>/dev/null
pkill -f "python.*8082" 2>/dev/null
echo "✅ LIGHTCAT stopped"
