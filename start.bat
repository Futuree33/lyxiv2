@echo off
echo Starting Lyxi Revival...
echo.

REM Start backend in a new window
start "Lyxi Backend" cmd /k "npm run start:dev"

REM Wait a moment for backend to initialize
timeout /t 2 /nobreak >nul

REM Start frontend in a new window
start "Lyxi Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend starting at: http://localhost:3001
echo Frontend starting at: http://localhost:5174
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
