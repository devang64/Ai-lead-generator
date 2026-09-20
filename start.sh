#!/bin/bash
echo "🚀 Starting AI Lead Generator..."
echo "1. Starting Python FastAPI Backend on http://localhost:8000..."
cd backend && python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "2. Starting Next.js UI Dashboard on http://localhost:3000..."
cd ../frontend && npm run dev -- -p 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ Both services started!"
echo "👉 Open Dashboard in Browser: http://localhost:3000"
echo "👉 FastAPI Backend Docs:       http://localhost:8000/docs"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
