param(
  [string]$TunnelName = "supersender",
  [string]$Hostname = "app.pakentrepreneur.me",
  [string]$ServiceUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Cloudflared = Join-Path $ProjectRoot "tools\cloudflared.exe"
$ConfigDir = Join-Path $ProjectRoot "cloudflare"
$ConfigPath = Join-Path $ConfigDir "config.yml"

if (!(Test-Path $Cloudflared)) {
  throw "cloudflared.exe not found at $Cloudflared. Download it into tools\cloudflared.exe first."
}

New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

Write-Host ""
Write-Host "Step 1: Cloudflare login will open in your browser." -ForegroundColor Cyan
Write-Host "Choose the Cloudflare account where $Hostname is added." -ForegroundColor Cyan
& $Cloudflared tunnel login

Write-Host ""
Write-Host "Step 2: Creating tunnel: $TunnelName" -ForegroundColor Cyan
& $Cloudflared tunnel create $TunnelName

$tunnelsJson = & $Cloudflared tunnel list --output json
$tunnels = $tunnelsJson | ConvertFrom-Json
$tunnel = $tunnels | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1
if (!$tunnel) {
  throw "Tunnel was created but could not be found in cloudflared tunnel list."
}

$TunnelId = $tunnel.id
$CredentialsFile = Join-Path $env:USERPROFILE ".cloudflared\$TunnelId.json"

Write-Host ""
Write-Host "Step 3: Creating DNS route: $Hostname -> $TunnelName" -ForegroundColor Cyan
& $Cloudflared tunnel route dns $TunnelName $Hostname

@"
tunnel: $TunnelId
credentials-file: $CredentialsFile

ingress:
  - hostname: $Hostname
    service: $ServiceUrl
  - service: http_status:404
"@ | Set-Content -Path $ConfigPath -Encoding UTF8

Write-Host ""
Write-Host "Cloudflare tunnel configured." -ForegroundColor Green
Write-Host "Config: $ConfigPath"
Write-Host ""
Write-Host "Run tunnel:"
Write-Host "powershell -ExecutionPolicy Bypass -File `"$ProjectRoot\scripts\run-cloudflare-tunnel.ps1`""
Write-Host ""
Write-Host "Meta redirect URLs:"
Write-Host "https://$Hostname/api/social/oauth/facebook/callback"
Write-Host "https://$Hostname/api/social/oauth/instagram/callback"
Write-Host ""
Write-Host "LinkedIn redirect URL:"
Write-Host "https://$Hostname/api/social/oauth/linkedin/callback"
