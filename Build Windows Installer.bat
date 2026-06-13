@echo off
title Build Health Tracker Installer
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-installer.ps1"
if errorlevel 1 (
    echo.
    echo  Build failed. See messages above.
    pause
    exit /b 1
)
echo.
echo  Open the "release" folder to find the setup file.
pause
exit /b 0
