@echo off
REM ==========================================================================
REM  Starts the Next.js dev server (localhost:3000) and opens a Pinggy tunnel
REM  Usage: double-click this file directly, no other tools needed.
REM  Note: free Pinggy links expire after 60 minutes - just rerun this file
REM  to get a fresh link.
REM ==========================================================================
setlocal
set "PROJECT_DIR=%~dp0"
set PORT=3000

echo Checking if a server is already running on port %PORT% ...
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo Found a server already running on port %PORT% - using it.
) else (
    echo No server found - opening a new window to run npm run dev ...
    start "webapp-dev-server" /D "%PROJECT_DIR%" cmd /k npm run dev
    echo Waiting for the server to start - 10 seconds ...
    timeout /t 10 /nobreak >nul
)

echo.
echo Opening Pinggy tunnel for localhost:%PORT% ...
echo The public link will be shown below - anyone with this link can
echo access your site immediately, do not share it with anyone else.
echo Press Ctrl+C to close the tunnel when you are done.
echo.
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:%PORT% free.pinggy.io

pause
