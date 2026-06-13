@echo off
title Health Tracker (Dev)
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev.ps1"
if errorlevel 1 pause
exit /b 0
