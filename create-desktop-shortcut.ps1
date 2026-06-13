# Creates a Desktop shortcut (use install-windows-shortcuts.ps1 for Start Menu too).
$projectRoot = $PSScriptRoot
& (Join-Path $projectRoot "install-windows-shortcuts.ps1") @args
