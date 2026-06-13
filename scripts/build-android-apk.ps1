# Build installable arm64 debug APK (works on Windows without Developer Mode / symlinks).
# Usage: .\scripts\build-android-apk.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot "android-env.ps1")

Set-Location $root
npm run build

$assets = Join-Path $root "src-tauri\gen\android\app\src\main\assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null
Get-ChildItem $assets -Exclude ".gitkeep" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root "dist\*") $assets -Recurse -Force
Write-Host "Copied frontend dist to Android assets."

Write-Host "Building Rust library for arm64..."
Push-Location (Join-Path $root "src-tauri")
cargo build --lib --release --target aarch64-linux-android
Pop-Location

$jniDir = Join-Path $root "src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"
New-Item -ItemType Directory -Force -Path $jniDir | Out-Null
$so = Join-Path $root "src-tauri\target\aarch64-linux-android\release\libtauri_app_lib.so"
Copy-Item $so (Join-Path $jniDir "libtauri_app_lib.so") -Force

Push-Location (Join-Path $root "src-tauri\gen\android")
.\gradlew.bat assembleArm64Debug -x rustBuildArm64Debug
Pop-Location

$apk = Join-Path $root "src-tauri\gen\android\app\build\outputs\apk\arm64\debug\app-arm64-debug.apk"
Write-Host ""
Write-Host "APK: $apk"
Write-Host "Install: adb install -r `"$apk`""
