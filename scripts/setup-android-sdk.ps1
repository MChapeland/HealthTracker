# One-time Android SDK setup for Health Tracker (Windows).
# Run from repo root: .\scripts\setup-android-sdk.ps1

$ErrorActionPreference = "Stop"
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$zipPath = "$env:TEMP\cmdline-tools-fresh.zip"
$zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

Write-Host "SDK root: $sdk"
New-Item -ItemType Directory -Force -Path $sdk | Out-Null

if (-not (Test-Path "$sdk\cmdline-tools\latest\bin\sdkmanager.bat")) {
    Write-Host "Downloading command-line tools..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    $ct = "$sdk\_ct"
    if (Test-Path $ct) { Remove-Item $ct -Recurse -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $ct)
    New-Item -ItemType Directory -Force -Path "$sdk\cmdline-tools\latest" | Out-Null
    Copy-Item "$ct\cmdline-tools\*" "$sdk\cmdline-tools\latest" -Recurse -Force
    Remove-Item $ct -Recurse -Force
}

$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path $jbr)) {
    Write-Error "Android Studio JBR not found at $jbr. Install Android Studio first."
}
$env:JAVA_HOME = $jbr
$env:ANDROID_HOME = $sdk
$env:Path = "$env:JAVA_HOME\bin;$sdk\cmdline-tools\latest\bin;$sdk\platform-tools;$env:Path"

$sdkmanager = "$sdk\cmdline-tools\latest\bin\sdkmanager.bat"
Write-Host "Installing SDK packages (may take several minutes)..."
1..50 | ForEach-Object { "y" } | & $sdkmanager --sdk_root=$sdk `
    "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;26.1.10909125"

$ndkDir = Get-ChildItem "$sdk\ndk" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($ndkDir) { $env:NDK_HOME = $ndkDir.FullName }

Write-Host ""
Write-Host "ANDROID_HOME=$sdk"
Write-Host "NDK_HOME=$env:NDK_HOME"
Write-Host "Done. Next: npm run tauri android init"
