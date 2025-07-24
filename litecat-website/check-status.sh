#!/bin/bash
echo "🔍 Checking LIGHTCAT status..."
echo ""

# Check API
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ API Server: RUNNING"
else
    echo "❌ API Server: NOT RUNNING"
fi

# Check UI
if curl -s http://localhost:8082 >/dev/null 2>&1; then
    echo "✅ UI Server: RUNNING"
else
    echo "❌ UI Server: NOT RUNNING"
fi

# Check endpoints
echo ""
echo "📊 Testing endpoints:"
curl -s http://localhost:3000/api/rgb/stats | head -c 100
echo "..."
