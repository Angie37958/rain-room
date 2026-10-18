@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 20 or later from https://nodejs.org/
  pause
  exit /b 1
)
echo Open http://127.0.0.1:5173 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node scripts/serve.mjs
pause
