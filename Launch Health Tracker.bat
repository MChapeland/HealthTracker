@echo off
title Health Tracker
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

REM Use this launcher — not src-tauri\target\debug\health-tracker.exe (needs Vite).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-release-build.ps1" -Launch
if errorlevel 1 (
    echo.
    echo  Launch failed. See messages above.
    pause
    exit /b 1
)
exit /b 0
