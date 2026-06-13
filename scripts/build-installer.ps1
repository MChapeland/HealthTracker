# Builds a Windows installer (.exe) and copies it to ./release for easy sharing.
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path

function Require-Command {
    param([string]$Name, [string]$InstallHint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name not found. $InstallHint"
    }
}

Require-Command "npm" "Install Node.js from https://nodejs.org/"
Require-Command "cargo" "Install Rust from https://rustup.rs/"
Require-Command "npx" "Install Node.js from https://nodejs.org/"

$version = (Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json).version
$bundleDir = Join-Path $projectRoot "src-tauri\target\release\bundle\nsis"
$releaseDir = Join-Path $projectRoot "release"

Write-Host ""
Write-Host 'Health Tracker - Windows installer build' -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor DarkGray
Write-Host ""

if (-not $SkipBuild) {
    Write-Host 'Building app and NSIS installer - may take several minutes on first run...' -ForegroundColor Yellow
    Push-Location $projectRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
        npx tauri build --bundles nsis
        if ($LASTEXITCODE -ne 0) {
            throw "Tauri build failed. Close Health Tracker if the .exe is locked, then try again."
        }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $bundleDir)) {
    throw "Installer output not found at $bundleDir. Run without -SkipBuild first."
}

$setupFiles = Get-ChildItem -Path $bundleDir -Filter "*setup*.exe" -File |
    Sort-Object LastWriteTime -Descending
if ($setupFiles.Count -eq 0) {
    $setupFiles = Get-ChildItem -Path $bundleDir -Filter "*.exe" -File |
        Sort-Object LastWriteTime -Descending
}
if ($setupFiles.Count -eq 0) {
    throw "No installer .exe found in $bundleDir"
}

$sourceSetup = $setupFiles[0].FullName
$destName = "Health-Tracker-Setup-$version.exe"
$destSetup = Join-Path $releaseDir $destName

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
Copy-Item -Path $sourceSetup -Destination $destSetup -Force

$installTxt = Join-Path $releaseDir "INSTALL.txt"
@"
Health Tracker $version - Windows installation
============================================

1. Double-click: $destName

2. If Windows SmartScreen appears:
   - Click "More info" (if shown), then "Run anyway"
   - The app is not code-signed yet; this warning is normal for personal builds.

3. Follow the setup wizard (Next, Install, Finish).

4. Open Health Tracker from the Start menu or desktop shortcut.

Requirements
--------------
- Windows 10 or 11 (64-bit)
- Microsoft Edge WebView2 (the installer will install it if missing)

Your data
---------
All information is stored on this PC only:
  %APPDATA%\com.matth.health-tracker\tracker.db

Uninstall
---------
Settings > Apps > Installed apps > Health Tracker > Uninstall

"@ | Set-Content -Path $installTxt -Encoding UTF8

Write-Host ""
Write-Host "Installer ready:" -ForegroundColor Green
Write-Host "  $destSetup" -ForegroundColor White
Write-Host ""
Write-Host "Share both files with the user:" -ForegroundColor Cyan
Write-Host "  - $destName" -ForegroundColor White
Write-Host "  - INSTALL.txt" -ForegroundColor White
Write-Host ""
