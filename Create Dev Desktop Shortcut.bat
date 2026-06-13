@echo off
title Create Health Tracker (Dev) Shortcuts
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-dev-desktop-shortcut.ps1"
if errorlevel 1 pause
exit /b 0
