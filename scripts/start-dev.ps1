# Dev mode: runs Vite + Tauri together. Do not open target\debug\health-tracker.exe directly.
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path

Remove-Item Env:TAURI_CLI_NO_DEV_SERVER_WAIT -ErrorAction SilentlyContinue

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js/npm not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "Rust/Cargo not found. Install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

try {
    $portInUse = Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "Port 1420 is already in use." -ForegroundColor Yellow
        Write-Host "Close other Health Tracker / Vite windows, or stop the process using that port." -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    # Get-NetTCPConnection may be unavailable; tauri dev will report port errors
}

Write-Host "Starting dev mode (Vite on http://localhost:1420)..." -ForegroundColor Cyan
Write-Host "Keep this window open while the app runs." -ForegroundColor DarkGray
Write-Host ""

Push-Location $projectRoot
try {
    npm run tauri dev
} finally {
    Pop-Location
}
