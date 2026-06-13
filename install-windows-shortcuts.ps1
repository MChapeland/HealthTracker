# Creates Start Menu + Desktop shortcuts for pinning (taskbar / Start).
# Creates shortcuts to Launch Health Tracker.bat (auto-checks for updates on start).
# Use -Build to force a release compile before creating shortcuts.
param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
. (Join-Path $projectRoot "scripts\shortcut-helpers.ps1")

$launcher = Get-HealthTrackerLauncher -ProjectRoot $projectRoot
$devLauncher = Get-HealthTrackerDevLauncher -ProjectRoot $projectRoot
$exe = Get-HealthTrackerExe -ProjectRoot $projectRoot

if ($Build) {
    & (Join-Path $projectRoot "scripts\ensure-release-build.ps1") -Force
    $exe = Get-HealthTrackerExe -ProjectRoot $projectRoot
}

if (-not $launcher -and -not $exe) {
    Write-Host ""
    Write-Host "No release app found." -ForegroundColor Red
    Write-Host "Build it first, then run this script again:" -ForegroundColor Yellow
    Write-Host "  npm run tauri build" -ForegroundColor White
    Write-Host "  .\install-windows-shortcuts.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or build automatically:" -ForegroundColor Yellow
    Write-Host "  .\install-windows-shortcuts.ps1 -Build" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: Launch Health Tracker.bat was not found in the project folder." -ForegroundColor DarkGray
    exit 1
}

if ($exe -like "*\debug\*") {
    Write-Host "Warning: Using debug build. For best results, run: npm run tauri build" -ForegroundColor Yellow
}

$icon = Get-HealthTrackerIcon -ProjectRoot $projectRoot
# Launcher .bat checks for updates and rebuilds before starting the app
$shortcutTarget = if ($launcher) { $launcher } else { $exe }
$workDir = $projectRoot

$startMenuPrograms = [Environment]::GetFolderPath("StartMenu")
$startMenuFolder = Join-Path $startMenuPrograms "Programs"
$startShortcut = Join-Path $startMenuFolder "Health Tracker.lnk"
$startDevShortcut = Join-Path $startMenuFolder "Health Tracker (Dev).lnk"

$desktop = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktop "Health Tracker.lnk"
$desktopDevShortcut = Join-Path $desktop "Health Tracker (Dev).lnk"

New-HealthTrackerShortcut -ShortcutPath $startShortcut -TargetPath $shortcutTarget `
    -WorkingDirectory $workDir -IconPath $icon
New-HealthTrackerShortcut -ShortcutPath $desktopShortcut -TargetPath $shortcutTarget `
    -WorkingDirectory $workDir -IconPath $icon

if ($devLauncher) {
    New-HealthTrackerShortcut -ShortcutPath $startDevShortcut -TargetPath $devLauncher `
        -WorkingDirectory $workDir -IconPath $icon
    New-HealthTrackerShortcut -ShortcutPath $desktopDevShortcut -TargetPath $devLauncher `
        -WorkingDirectory $workDir -IconPath $icon
}

Write-Host ""
Write-Host "Shortcuts created:" -ForegroundColor Green
Write-Host "  Start menu: $startShortcut"
Write-Host "  Desktop:    $desktopShortcut"
if ($devLauncher) {
    Write-Host "  Start menu (dev): $startDevShortcut"
    Write-Host "  Desktop (dev):    $desktopDevShortcut"
}
Write-Host ""
Write-Host "Release shortcuts use Launch Health Tracker.bat (fast or full rebuild)." -ForegroundColor DarkGray
Write-Host "Dev shortcuts use hot-reload and need the terminal left open." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Pin to taskbar or Start:" -ForegroundColor Cyan
Write-Host "  1. Press Windows key and search for Health Tracker" -ForegroundColor Cyan
Write-Host "  2. Right-click -> Pin to Start or Pin to taskbar" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see localhost refused to connect:" -ForegroundColor Yellow
Write-Host "  Use the Health Tracker shortcut, not the debug exe in target\debug" -ForegroundColor Yellow
Write-Host "  For dev mode, use Health Tracker (Dev) and keep the terminal open" -ForegroundColor Yellow
Write-Host "  Re-pin from the new shortcut, not an old pinned exe" -ForegroundColor Yellow
Write-Host ""
