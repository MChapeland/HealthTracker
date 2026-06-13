# Same as Launch Health Tracker.bat — starts Vite + app via tauri dev.
# Do not run health-tracker.exe directly; it needs localhost:1420 without a release build.
# First run compiles Rust deps and can take several minutes.

$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "Cargo not found. Install Rust from https://rustup.rs/ then restart this terminal." -ForegroundColor Red
    exit 1
}

& (Join-Path $PSScriptRoot "scripts\start-dev.ps1")
