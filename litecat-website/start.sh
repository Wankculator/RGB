#!/bin/bash
echo "Starting LIGHTCAT servers..."

# Start API server
echo "Starting API server on port 3000..."
node start-server.js &
API_PID=$!

# Start UI server
echo "Starting UI server on port 8082..."
cd client && python3 -m http.server 8082 &
UI_PID=$!

echo ""
echo "✅ Servers started!"
echo "API: http://localhost:3000"
echo "UI: http://localhost:8082"
echo ""
echo "Press Ctrl+C to stop servers"

# Wait for interrupt
trap "kill $API_PID $UI_PID; exit" INT
wait
