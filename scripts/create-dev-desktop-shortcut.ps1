# Creates Desktop + Start Menu shortcuts for Health Tracker (Dev).
# Uses a PowerShell launcher so Windows 11 allows Pin to Start.
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
. (Join-Path $projectRoot "scripts\shortcut-helpers.ps1")

$devScript = Join-Path $projectRoot "scripts\start-dev.ps1"
if (-not (Test-Path $devScript)) {
    Write-Host ""
    Write-Host "Dev launcher not found:" -ForegroundColor Red
    Write-Host "  $devScript" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$icon = Get-HealthTrackerIcon -ProjectRoot $projectRoot
$shortcutName = "Health Tracker (Dev).lnk"

$desktop = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktop $shortcutName

$startMenuPrograms = [Environment]::GetFolderPath("StartMenu")
$startMenuFolder = Join-Path $startMenuPrograms "Programs"
$startShortcut = Join-Path $startMenuFolder $shortcutName

New-HealthTrackerDevShortcut -ShortcutPath $desktopShortcut -ProjectRoot $projectRoot -IconPath $icon
New-HealthTrackerDevShortcut -ShortcutPath $startShortcut -ProjectRoot $projectRoot -IconPath $icon

Write-Host ""
Write-Host "Shortcuts created:" -ForegroundColor Green
Write-Host "  Desktop:    $desktopShortcut"
Write-Host "  Start menu: $startShortcut"
Write-Host ""
Write-Host "Pin to Start:" -ForegroundColor Cyan
Write-Host "  1. Press the Windows key and search for Health Tracker (Dev)" -ForegroundColor Cyan
Write-Host "  2. Right-click the result -> Pin to Start" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dev mode uses hot-reload; keep the terminal window open while the app runs." -ForegroundColor DarkGray
Write-Host ""
