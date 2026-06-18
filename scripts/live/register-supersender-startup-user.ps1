param(
  [string]$ProjectRoot = "D:\SuperSenderPro\supersender-pro-final",
  [string]$LauncherName = "SuperSenderPro-Server.bat"
)

$ErrorActionPreference = "Stop"

$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
New-Item -ItemType Directory -Path $startup -Force | Out-Null

$watchScript = Join-Path $ProjectRoot "scripts\live\watch-supersender-live.ps1"
if (!(Test-Path $watchScript)) {
  throw "Watchdog script not found: $watchScript"
}

$launcher = Join-Path $startup $LauncherName
$content = @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$watchScript"
"@

Set-Content -LiteralPath $launcher -Value $content -Encoding ASCII

Write-Host "Registered user startup launcher:"
Write-Host "  $launcher"
Write-Host ""
Write-Host "It will run a self-healing watchdog when this Windows user logs in."
