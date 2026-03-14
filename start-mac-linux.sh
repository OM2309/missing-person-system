#!/bin/bash

echo "========================================"
echo "  Missing Person Finder - Startup"
echo "========================================"

# Start backend
echo "Starting Python backend..."
cd backend
pip install -r requirements.txt &> /dev/null &
python main.py &
BACKEND_PID=$!
cd ..

sleep 3

# Start frontend
echo "Starting Next.js frontend..."
cd frontend
npm install &> /dev/null
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo " Backend:  http://localhost:8000"
echo " Frontend: http://localhost:3000"
echo " Admin:    http://localhost:3000/admin"
echo " Camera:   http://localhost:3000/camera"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
