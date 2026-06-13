# Sets Android build environment for Health Tracker (run before android:dev / android:build).
# Usage: . .\scripts\android-env.ps1

param(
    [int]$MinApiLevel = 26
)

$sdkCandidates = @(
    $env:ANDROID_HOME,
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
) | Where-Object { $_ -and (Test-Path $_) }

if ($sdkCandidates.Count -eq 0) {
    Write-Error @"
Android SDK not found. Install Android Studio and SDK components, then set ANDROID_HOME.
See android/README.md and https://v2.tauri.app/start/prerequisites/#android
"@
    return
}

$env:ANDROID_HOME = $sdkCandidates[0]
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

$jbrCandidates = @(
    $env:JAVA_HOME,
    "C:\Program Files\Android\Android Studio\jbr",
    "$env:ProgramFiles\Android\Android Studio\jbr"
) | Where-Object { $_ -and (Test-Path $_) }

if ($jbrCandidates.Count -gt 0) {
    $env:JAVA_HOME = $jbrCandidates[0]
    Write-Host "JAVA_HOME=$env:JAVA_HOME"
}

$ndkRoot = Join-Path $env:ANDROID_HOME "ndk"
$ndkVersion = $null
if (Test-Path $ndkRoot) {
    $ndkVersion = Get-ChildItem $ndkRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
}

if (-not $ndkVersion) {
    Write-Error @"
Android NDK not found under $ndkRoot.
Install NDK (Side by side) in Android Studio SDK Manager, or run:
  .\scripts\setup-android-sdk.ps1
"@
    return
}

$env:NDK_HOME = $ndkVersion.FullName
$env:ANDROID_NDK_HOME = $env:NDK_HOME
Write-Host "NDK_HOME=$env:NDK_HOME"

$prebuiltHost = if ($IsWindows -or $env:OS -eq "Windows_NT") { "windows-x86_64" } else { "linux-x86_64" }
$toolchainBin = Join-Path $env:NDK_HOME "toolchains\llvm\prebuilt\$prebuiltHost\bin"
if (-not (Test-Path $toolchainBin)) {
    Write-Error "NDK LLVM toolchain not found at $toolchainBin"
    return
}

$env:Path = "$toolchainBin;$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

$androidToolchains = @{
    "aarch64-linux-android"   = "aarch64-linux-android$MinApiLevel-clang.cmd"
    "armv7-linux-androideabi" = "armv7a-linux-androideabi$MinApiLevel-clang.cmd"
    "i686-linux-android"      = "i686-linux-android$MinApiLevel-clang.cmd"
    "x86_64-linux-android"    = "x86_64-linux-android$MinApiLevel-clang.cmd"
}

$llvmAr = Join-Path $toolchainBin "llvm-ar.exe"
if (-not (Test-Path $llvmAr)) {
    $llvmAr = Join-Path $toolchainBin "llvm-ar"
}

foreach ($entry in $androidToolchains.GetEnumerator()) {
    $rustTarget = $entry.Key
    $clangName = $entry.Value
    $clang = Join-Path $toolchainBin $clangName
    if (-not (Test-Path $clang)) {
        Write-Error "Missing NDK compiler: $clang"
        return
    }

    $envKey = ($rustTarget -replace "-", "_").ToUpperInvariant()
    Set-Item -Path "env:CC_$envKey" -Value $clang
    Set-Item -Path "env:CXX_$envKey" -Value ($clang -replace "-clang\.cmd$", "-clang++.cmd")
    Set-Item -Path "env:AR_$envKey" -Value $llvmAr
    Set-Item -Path "env:CARGO_TARGET_${envKey}_LINKER" -Value $clang
}

$targets = @(
    "aarch64-linux-android",
    "armv7-linux-androideabi",
    "i686-linux-android",
    "x86_64-linux-android"
)
foreach ($t in $targets) {
    cmd /c "rustup target add $t 2>nul" | Out-Null
}

Write-Host "Android environment ready. Run: npm run android:dev"
