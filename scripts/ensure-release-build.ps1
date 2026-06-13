# Ensures the release .exe matches current source, rebuilds if needed, optionally launches.
param(
    [switch]$Launch,
    [switch]$Force,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path

$releaseExe = Join-Path $projectRoot "src-tauri\target\release\health-tracker.exe"

$script:FrontendPaths = @(
    "src", "index.html", "vite.config.ts", "package.json", "package-lock.json"
)
$script:RustPaths = @(
    "src-tauri\src", "src-tauri\Cargo.toml", "src-tauri\Cargo.lock",
    "src-tauri\tauri.conf.json", "src-tauri\migrations", "src-tauri\build.rs",
    "src-tauri\capabilities"
)
$script:AllPaths = $script:FrontendPaths + $script:RustPaths

function Get-LatestWriteTime {
    param([string[]]$Paths)
    $latest = [datetime]::MinValue
    foreach ($root in $Paths) {
        $full = Join-Path $projectRoot $root
        if (-not (Test-Path $full)) { continue }
        $item = Get-Item $full -Force
        if (-not $item.PSIsContainer -and $item.LastWriteTime -gt $latest) {
            $latest = $item.LastWriteTime
        }
        if ($item.PSIsContainer) {
            $files = Get-ChildItem -Path $full -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.FullName -notmatch '\\node_modules\\|\\target\\|\\dist\\|\\\.git\\'
                }
            foreach ($f in $files) {
                if ($f.Extension -match '^\.(ts|tsx|js|jsx|css|html|json|rs|sql|toml|lock)$' -and
                    $f.LastWriteTime -gt $latest) {
                    $latest = $f.LastWriteTime
                }
            }
        }
    }
    return $latest
}

function Test-ReleaseBuildStale {
    if (-not (Test-Path $releaseExe)) {
        return @{
            Stale         = $true
            Tier          = "full"
            Reason        = "No release build found."
            ExeTime       = $null
            FrontendTime  = Get-LatestWriteTime $script:FrontendPaths
            RustTime      = Get-LatestWriteTime $script:RustPaths
        }
    }

    $exeTime = (Get-Item $releaseExe).LastWriteTime
    $frontendTime = Get-LatestWriteTime $script:FrontendPaths
    $rustTime = Get-LatestWriteTime $script:RustPaths

    $rustStale = $rustTime -gt $exeTime
    $frontendStale = $frontendTime -gt $exeTime

    if ($rustStale) {
        return @{
            Stale         = $true
            Tier          = "full"
            Reason        = "Rust or app config changed since last build."
            ExeTime       = $exeTime
            FrontendTime  = $frontendTime
            RustTime      = $rustTime
        }
    }

    if ($frontendStale) {
        return @{
            Stale         = $true
            Tier          = "frontend"
            Reason        = "UI source changed since last build."
            ExeTime       = $exeTime
            FrontendTime  = $frontendTime
            RustTime      = $rustTime
        }
    }

    return @{
        Stale         = $false
        Tier          = "none"
        Reason        = "Release build is up to date."
        ExeTime       = $exeTime
        FrontendTime  = $frontendTime
        RustTime      = $rustTime
    }
}

function Assert-BuildTools {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "Node.js/npm not found. Install from https://nodejs.org/"
    }
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
        throw "Rust/Cargo not found. Install from https://rustup.rs/"
    }
}

function Invoke-FrontendBuild {
    Assert-BuildTools
    Write-Host ""
    Write-Host "Updating UI only (fast rebuild)..." -ForegroundColor Cyan
    Write-Host "Close the app if the build reports a locked .exe." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $projectRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed (exit $LASTEXITCODE)." }

        Push-Location (Join-Path $projectRoot "src-tauri")
        try {
            cargo build --release
            if ($LASTEXITCODE -ne 0) { throw "Cargo build failed (exit $LASTEXITCODE)." }
        } finally {
            Pop-Location
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-Path $releaseExe)) {
        throw "Build finished but release executable was not found."
    }
}

function Invoke-FullBuild {
    Assert-BuildTools
    Write-Host ""
    Write-Host "Updating app (Rust or config changed)..." -ForegroundColor Cyan
    Write-Host "This may take a few minutes. Close the app if the build reports a locked .exe." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $projectRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed (exit $LASTEXITCODE)." }

        npx tauri build --no-bundle
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed (exit $LASTEXITCODE). If you see 'Access is denied', quit Health Tracker and run again."
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-Path $releaseExe)) {
        throw "Build finished but release executable was not found."
    }
}

function Invoke-ReleaseBuild {
    param([string]$Tier)

    if ($Tier -eq "frontend") {
        Invoke-FrontendBuild
    } else {
        Invoke-FullBuild
    }
}

function Start-HealthTrackerRelease {
    if (-not (Test-Path $releaseExe)) {
        throw "Release build not found. Run: npm run build:app"
    }
    $debugExe = Join-Path $projectRoot "src-tauri\target\debug\health-tracker.exe"
    Write-Host "Starting release app..." -ForegroundColor Green
    Write-Host "  $releaseExe" -ForegroundColor DarkGray
    if (Test-Path $debugExe) {
        Write-Host ""
        Write-Host "Do not open the debug .exe in src-tauri\target\debug\" -ForegroundColor Yellow
        Write-Host "(it needs the Vite dev server and shows 'localhost refused')." -ForegroundColor Yellow
        Write-Host ""
    }
    Start-Process -FilePath $releaseExe -WorkingDirectory $projectRoot
}

function Start-HealthTrackerDev {
    Write-Host ""
    Write-Host "Starting Health Tracker in dev mode..." -ForegroundColor Cyan
    Write-Host 'Vite will start on http://localhost:1420 - keep this window open.' -ForegroundColor DarkGray
    Write-Host "Do not open health-tracker.exe from target\debug\ manually." -ForegroundColor DarkGray
    Write-Host ""
    Remove-Item Env:TAURI_CLI_NO_DEV_SERVER_WAIT -ErrorAction SilentlyContinue
    Push-Location $projectRoot
    try {
        npm run tauri dev
    } finally {
        Pop-Location
    }
}

$status = Test-ReleaseBuildStale
$needsBuild = $Force -or $status.Stale
$buildTier = if ($Force) { "full" } else { $status.Tier }

if ($CheckOnly) {
    if ($needsBuild) {
        $tierLabel = if ($buildTier -eq "frontend") { "fast (UI only)" } else { "full" }
        Write-Host "$($status.Reason) Rebuild tier: $tierLabel." -ForegroundColor Yellow
        if ($status.ExeTime) { Write-Host "  App built: $($status.ExeTime)" -ForegroundColor DarkGray }
        if ($status.FrontendTime -gt [datetime]::MinValue) {
            Write-Host "  Latest UI change: $($status.FrontendTime)" -ForegroundColor DarkGray
        }
        if ($status.RustTime -gt [datetime]::MinValue) {
            Write-Host "  Latest Rust change: $($status.RustTime)" -ForegroundColor DarkGray
        }
        exit 1
    }
    Write-Host $status.Reason -ForegroundColor Green
    exit 0
}

if ($needsBuild) {
    Write-Host $status.Reason -ForegroundColor Yellow
    if ($status.ExeTime) {
        Write-Host "  App built:        $($status.ExeTime)" -ForegroundColor DarkGray
        if ($status.FrontendTime -gt [datetime]::MinValue) {
            Write-Host "  Latest UI change: $($status.FrontendTime)" -ForegroundColor DarkGray
        }
        if ($status.RustTime -gt [datetime]::MinValue) {
            Write-Host "  Latest Rust change: $($status.RustTime)" -ForegroundColor DarkGray
        }
    }
    try {
        Invoke-ReleaseBuild -Tier $buildTier
        $status = Test-ReleaseBuildStale
        Write-Host "Build complete." -ForegroundColor Green
    } catch {
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($Launch -and (Test-Path $releaseExe)) {
            Write-Host ""
            Write-Host 'Build failed - starting last successful release build...' -ForegroundColor Yellow
            Start-HealthTrackerRelease
            exit 0
        }
        if ($Launch) {
            Write-Host ""
            Write-Host "No release build available. Starting dev mode..." -ForegroundColor Yellow
            Start-HealthTrackerDev
            exit 0
        }
        exit 1
    }
} elseif ($Launch) {
    Write-Host $status.Reason -ForegroundColor Green
}

if (-not $Launch) { exit 0 }

if (Test-Path $releaseExe) {
    Start-HealthTrackerRelease
    exit 0
}

Write-Host "No release build available." -ForegroundColor Yellow
Start-HealthTrackerDev
