function Get-HealthTrackerLauncher {
    param([string]$ProjectRoot)
    $bat = Join-Path $ProjectRoot "Launch Health Tracker.bat"
    if (Test-Path $bat) { return (Resolve-Path $bat).Path }
    return $null
}

function Get-HealthTrackerDevLauncher {
    param([string]$ProjectRoot)
    $bat = Join-Path $ProjectRoot "Launch Health Tracker (Dev).bat"
    if (Test-Path $bat) { return (Resolve-Path $bat).Path }
    return $null
}

function Get-HealthTrackerReleaseExe {
    param([string]$ProjectRoot)
    $path = Join-Path $ProjectRoot "src-tauri\target\release\health-tracker.exe"
    if (Test-Path $path) { return (Resolve-Path $path).Path }
    return $null
}

function Get-HealthTrackerExe {
    param([string]$ProjectRoot)
    Get-HealthTrackerReleaseExe -ProjectRoot $ProjectRoot
}

function Get-HealthTrackerIcon {
    param([string]$ProjectRoot)
    $icon = Join-Path $ProjectRoot "src-tauri\icons\icon.ico"
    if (Test-Path $icon) { return $icon }
    return $null
}

function New-HealthTrackerShortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath,
        [string]$WorkingDirectory,
        [string]$IconPath,
        # Back-compat alias
        [string]$TargetExe
    )
    if ($TargetExe -and -not $TargetPath) { $TargetPath = $TargetExe }
    $dir = Split-Path $ShortcutPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }

    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut($ShortcutPath)
    $link.TargetPath = $TargetPath
    $link.WorkingDirectory = $WorkingDirectory
    $link.Description = "Personal health and weight tracking"
    $link.WindowStyle = 1
    if ($IconPath) {
        $link.IconLocation = "$IconPath,0"
    }
    $link.Save()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
}

function New-HealthTrackerDevShortcut {
    param(
        [string]$ShortcutPath,
        [string]$ProjectRoot,
        [string]$IconPath
    )
    # Windows 11 blocks pinning shortcuts that target .bat files directly.
    # Launch via powershell.exe so Pin to Start / taskbar works.
    $devScript = Join-Path $ProjectRoot "scripts\start-dev.ps1"
    if (-not (Test-Path $devScript)) {
        throw "Dev script not found: $devScript"
    }
    $devScript = (Resolve-Path $devScript).Path
    $powershell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

    $dir = Split-Path $ShortcutPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }

    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut($ShortcutPath)
    $link.TargetPath = $powershell
    $link.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$devScript`""
    $link.WorkingDirectory = $ProjectRoot
    $link.Description = "Health Tracker dev mode (Vite + Tauri hot reload)"
    $link.WindowStyle = 1
    if ($IconPath) {
        $link.IconLocation = "$IconPath,0"
    }
    $link.Save()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
}
