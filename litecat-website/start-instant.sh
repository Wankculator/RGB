#!/bin/bash
echo "🚀 Starting LIGHTCAT (Instant Mode)..."

# Kill existing processes
pkill -f "node.*simple-api" 2>/dev/null
pkill -f "node.*serve-ui" 2>/dev/null
pkill -f "python.*8082" 2>/dev/null

# Start servers
node simple-api.js &
API_PID=$!

if [ -f "serve-ui.js" ]; then
    node serve-ui.js &
else
    cd client && python3 -m http.server 8082 &
    cd ..
fi
UI_PID=$!

echo ""
echo "✅ LIGHTCAT is running!"
echo ""
echo "🌐 UI:  http://localhost:8082"
echo "🔌 API: http://localhost:3000"
echo "📊 Stats: http://localhost:3000/api/rgb/stats"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $API_PID $UI_PID 2>/dev/null; echo 'Stopped'; exit" INT
wait
