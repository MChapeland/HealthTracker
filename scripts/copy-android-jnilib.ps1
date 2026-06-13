# Copy Rust Android library into jniLibs (avoids Tauri symlink on Windows).
param(
    [ValidateSet("debug", "release")]
    [string]$Profile = "debug",
    [ValidateSet("aarch64", "armv7", "x86", "x86_64")]
    [string]$Target = "aarch64"
)

$root = Split-Path $PSScriptRoot -Parent
$abiMap = @{
    aarch64 = "arm64-v8a"
    armv7   = "armeabi-v7a"
    x86     = "x86"
    x86_64  = "x86_64"
}
$rustTarget = @{
    aarch64 = "aarch64-linux-android"
    armv7   = "armv7-linux-androideabi"
    x86     = "i686-linux-android"
    x86_64  = "x86_64-linux-android"
}

$so = Join-Path $root "src-tauri\target\$($rustTarget[$Target])\$Profile\libtauri_app_lib.so"
if (-not (Test-Path $so)) {
    Write-Error "Missing $so. Run: cargo build --lib --$Profile --target $($rustTarget[$Target])"
}

$jniDir = Join-Path $root "src-tauri\gen\android\app\src\main\jniLibs\$($abiMap[$Target])"
New-Item -ItemType Directory -Force -Path $jniDir | Out-Null
Copy-Item $so (Join-Path $jniDir "libtauri_app_lib.so") -Force
Write-Host "Copied $Profile $($abiMap[$Target]) library to jniLibs."
