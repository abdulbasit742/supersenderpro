param(
  [string]$ConfigPath = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Cloudflared = Join-Path $ProjectRoot "tools\cloudflared.exe"
if (!$ConfigPath) {
  $ConfigPath = Join-Path $ProjectRoot "cloudflare\config.yml"
}

if (!(Test-Path $Cloudflared)) {
  throw "cloudflared.exe not found at $Cloudflared"
}
if (!(Test-Path $ConfigPath)) {
  throw "Tunnel config not found at $ConfigPath. Run scripts\setup-cloudflare-tunnel.ps1 first."
}

Write-Host "Starting Cloudflare tunnel with config:" -ForegroundColor Cyan
Write-Host $ConfigPath
& $Cloudflared tunnel --config $ConfigPath run
