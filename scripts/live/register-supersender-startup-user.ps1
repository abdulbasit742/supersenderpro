param(
  [string]$ProjectRoot = "D:\SuperSenderPro\supersender-pro-final",
  [string]$LauncherName = "SuperSenderPro-Server.bat"
)

$ErrorActionPreference = "Stop"

$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
New-Item -ItemType Directory -Path $startup -Force | Out-Null

$startScript = Join-Path $ProjectRoot "scripts\live\start-supersender-server.ps1"
if (!(Test-Path $startScript)) {
  throw "Startup script not found: $startScript"
}

$launcher = Join-Path $startup $LauncherName
$content = @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$startScript"
"@

Set-Content -LiteralPath $launcher -Value $content -Encoding ASCII

Write-Host "Registered user startup launcher:"
Write-Host "  $launcher"
Write-Host ""
Write-Host "It will run when this Windows user logs in."

