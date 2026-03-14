@echo off
echo ========================================
echo   Missing Person Finder - Startup
echo ========================================
echo.

echo Starting Backend (Python FastAPI)...
cd backend
start cmd /k "pip install -r requirements.txt && python main.py"
cd ..

timeout /t 5

echo Starting Frontend (Next.js)...
cd frontend
start cmd /k "npm install && npm run dev"
cd ..

echo.
echo ========================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo  Admin:    http://localhost:3000/admin
echo  Camera:   http://localhost:3000/camera
echo ========================================
pause
