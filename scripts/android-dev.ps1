# Android dev on Windows without symlink privileges (Developer Mode optional).
# Usage: .\scripts\android-dev.ps1 [-UseLanIp] [-Emulator]
param(
    [switch]$UseLanIp,
    [switch]$Emulator
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot "android-env.ps1")

function Test-WindowsDeveloperMode {
    try {
        $v = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name AllowDevelopmentWithoutDevLicense -ErrorAction SilentlyContinue
        return $v.AllowDevelopmentWithoutDevLicense -eq 1
    } catch {
        return $false
    }
}

function Get-LanIPv4 {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notmatch "^(127\.|169\.254\.)" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -First 1 -ExpandProperty IPAddress
}

function Test-AndroidEmulatorConnected {
    $line = adb devices -l 2>&1 | Select-String "\sdevice(\s|$)" | Select-Object -First 1
    if (-not $line) { return $false }
    return [string]$line -match "emulator"
}

function Set-AndroidDevUrl {
    param([string]$DevUrl)
    $configPath = Join-Path $root "src-tauri\tauri.android.conf.json"
    $content = @"
{
  "build": {
    "devUrl": "$DevUrl"
  }
}
"@
    # UTF8 without BOM; -Encoding utf8NoBOM requires PowerShell 6+
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($configPath, $content, $utf8NoBom)
}

$forceCopy = [string]::IsNullOrEmpty($env:TAURI_ANDROID_FORCE_COPY)
if ((Test-WindowsDeveloperMode) -and -not $forceCopy) {
    Write-Host "Developer Mode is on; using tauri android dev." -ForegroundColor Cyan
    Set-Location $root
    if ($Emulator) {
        npm run tauri android dev
    } else {
        # Physical devices need the PC LAN IP; Tauri sets TAURI_DEV_HOST automatically with --host.
        npm run tauri android dev -- --host
    }
    exit $LASTEXITCODE
}

Write-Host "Windows symlink workaround: copy jniLibs and Gradle install." -ForegroundColor Cyan
Write-Host 'Tip: Enable Developer Mode in Windows Settings to use npm run android:dev:tauri.' -ForegroundColor DarkGray
Write-Host ""

$devices = adb devices 2>&1 | Select-String "device$"
if (-not $devices) {
    Write-Error "No Android device or emulator found. Start an AVD in Android Studio, then run again."
}

$isEmulator = $Emulator -or (Test-AndroidEmulatorConnected -and -not $UseLanIp)
if ($isEmulator) {
    $devUrl = "http://10.0.2.2:1420"
    $viteHost = "0.0.0.0"
    Write-Host "Emulator devUrl: $devUrl (host port 1420)"
} else {
    $ip = Get-LanIPv4
    if (-not $ip) {
        Write-Error "Could not detect LAN IP. Connect the phone to the same Wi-Fi as this PC, or use an emulator with -Emulator."
    }
    $devUrl = "http://${ip}:1420"
    $viteHost = $ip
    Write-Host "Physical device devUrl: $devUrl"
    Write-Host "Phone and PC must be on the same Wi-Fi. Allow port 1420 through Windows Firewall if prompted." -ForegroundColor DarkGray
}

Set-AndroidDevUrl -DevUrl $devUrl

Set-Location $root
$env:TAURI_DEV_HOST = $viteHost

$viteRunning = Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue
if (-not $viteRunning) {
    Write-Host "Starting Vite on port 1420 (new window)..."
    $viteCmd = "Set-Location '$root'; `$env:TAURI_DEV_HOST='$viteHost'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $viteCmd | Out-Null
    $deadline = (Get-Date).AddMinutes(2)
    while ((Get-Date) -lt $deadline) {
        if (Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue) { break }
        Start-Sleep -Seconds 1
    }
    if (-not (Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue)) {
        Write-Error "Vite did not start on port 1420."
    }
}

adb reverse tcp:1420 tcp:1420 2>$null | Out-Null

Write-Host "Building Rust (aarch64 debug)..."
Push-Location (Join-Path $root "src-tauri")
cargo build --lib --target aarch64-linux-android
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

& (Join-Path $PSScriptRoot "copy-android-jnilib.ps1") -Profile debug -Target aarch64

Write-Host "Installing debug APK on device..."
Push-Location (Join-Path $root "src-tauri\gen\android")
.\gradlew.bat installArm64Debug -x rustBuildArm64Debug
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { exit $gradleExit }

$pkg = "com.matth.health_tracker"
Write-Host "Launching app..."
adb shell am start -n "$pkg/.MainActivity" | Out-Null

Write-Host ""
Write-Host "Dev loop:" -ForegroundColor Green
Write-Host "  - UI: edit src/; Vite hot-reloads in the app ($devUrl)"
Write-Host "  - Rust: run copy-android-jnilib.ps1, then gradlew installArm64Debug -x rustBuildArm64Debug"
Write-Host "  - Or re-run: .\scripts\android-dev.ps1"
