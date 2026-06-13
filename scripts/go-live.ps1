param(
  [string]$PublicUrl = "https://app.pakentrepreneur.me",
  [string]$Proxy = "http://172.30.10.10:3128",
  [switch]$NoProxy
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Node = Join-Path $Root "node-local.exe"
$Server = Join-Path $Root "server.js"
$Cloudflared = Join-Path $Root "tools\cloudflared.exe"
$TokenFiles = @(
  (Join-Path $Root ".cloudflare-tunnel-token"),
  (Join-Path $Root "cloudflare-token.txt"),
  (Join-Path $Root "cloudflare-token.txt.txt")
)
$StatusPath = Join-Path $Root "live-status.json"

function Write-Step($Message) {
  Write-Host "[live] $Message" -ForegroundColor Cyan
}

function Write-Warn($Message) {
  Write-Host "[live] $Message" -ForegroundColor Yellow
}

function Save-Status($Status) {
  $Status.generatedAt = (Get-Date).ToString("s")
  $Status | ConvertTo-Json -Depth 8 | Set-Content -Path $StatusPath -Encoding UTF8
}

function Stop-MatchingProcess($Pattern) {
  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $Pattern } |
    ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
}

function Get-TunnelToken {
  foreach ($file in $TokenFiles) {
    if (!(Test-Path $file)) { continue }
    $raw = Get-Content $file -Raw
    $match = [regex]::Match($raw, "eyJ[a-zA-Z0-9_\-.=]+")
    if ($match.Success) { return $match.Value }
  }
  throw "No Cloudflare tunnel token found. Checked: $($TokenFiles -join ', ')"
}

function Ensure-Cloudflared {
  if (Test-Path $Cloudflared) { return }
  Write-Step "Downloading cloudflared..."
  New-Item -ItemType Directory -Force -Path (Split-Path $Cloudflared -Parent) | Out-Null
  Invoke-WebRequest "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $Cloudflared -UseBasicParsing
}

function Test-Http($Url, $TimeoutSec = 12) {
  try {
    $response = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return @{
      ok = $true
      statusCode = [int]$response.StatusCode
      body = [string]$response.Content
      error = $null
    }
  } catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }
    return @{
      ok = $false
      statusCode = $statusCode
      body = $null
      error = $_.Exception.Message
    }
  }
}

function Start-Cloudflared($UseProxy) {
  Stop-MatchingProcess "cloudflared.exe"
  Stop-MatchingProcess "local-cloudflare-dns.js"

  if ($UseProxy) {
    $env:HTTP_PROXY = $Proxy
    $env:HTTPS_PROXY = $Proxy
    $env:ALL_PROXY = $Proxy
    Write-Step "Proxy enabled for Cloudflare tunnel: $Proxy"
  } else {
    Remove-Item Env:\HTTP_PROXY -ErrorAction SilentlyContinue
    Remove-Item Env:\HTTPS_PROXY -ErrorAction SilentlyContinue
    Remove-Item Env:\ALL_PROXY -ErrorAction SilentlyContinue
    Remove-Item Env:\http_proxy -ErrorAction SilentlyContinue
    Remove-Item Env:\https_proxy -ErrorAction SilentlyContinue
    Remove-Item Env:\all_proxy -ErrorAction SilentlyContinue
    Write-Step "Proxy disabled for Cloudflare tunnel"
  }
  $env:NO_PROXY = "localhost,127.0.0.1,::1"
  $env:GODEBUG = "netdns=go"

  Start-Process -FilePath $Node -ArgumentList "scripts\local-cloudflare-dns.js" -WorkingDirectory $Root -RedirectStandardOutput (Join-Path $Root "cloudflared-dns.out.log") -RedirectStandardError (Join-Path $Root "cloudflared-dns.err.log") -WindowStyle Hidden
  Start-Sleep -Seconds 1
  Start-Process -FilePath $Cloudflared -ArgumentList @(
    "tunnel",
    "--protocol", "http2",
    "--edge-ip-version", "4",
    "run",
    "--dns-resolver-addrs", "127.0.0.1:53535",
    "--token", $token
  ) -WorkingDirectory $Root -RedirectStandardOutput (Join-Path $Root "cloudflared.out.log") -RedirectStandardError (Join-Path $Root "cloudflared.err.log") -WindowStyle Hidden
}

function Get-LogTail($Path, $Lines = 12) {
  if (!(Test-Path $Path)) { return @() }
  return @(Get-Content $Path -Tail $Lines -ErrorAction SilentlyContinue | ForEach-Object { [string]$_ })
}

Set-Location $Root
Write-Step "Starting local SuperSender server on http://localhost:3001"
Get-Process | Where-Object { $_.ProcessName -eq "node-local" } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep -Seconds 1
Start-Process -FilePath $Node -ArgumentList "server.js" -WorkingDirectory $Root -RedirectStandardOutput (Join-Path $Root "server-live.out") -RedirectStandardError (Join-Path $Root "server-live.err") -WindowStyle Hidden
Start-Sleep -Seconds 6

try {
  $local = Test-Http "http://localhost:3001/api/health" 10
  if (!$local.ok) { throw $local.error }
  Write-Step "Local server OK: $($local.statusCode)"
} catch {
  $status = @{
    local = @{ ok = $false; url = "http://localhost:3001"; error = $_.Exception.Message }
    public = @{ ok = $false; url = $PublicUrl; error = "Local server failed first" }
    nextStep = "Check server-live.err and fix local Node server before retrying."
  }
  Save-Status $status
  throw "Local server did not start: $($_.Exception.Message)"
}

Ensure-Cloudflared
$token = Get-TunnelToken

Write-Step "Starting Cloudflare named tunnel for $PublicUrl"
$attempts = @()
if ($NoProxy) {
  $attempts = @($false)
} else {
  $attempts = @($true, $false)
}

$public = $null
foreach ($useProxy in $attempts) {
  Start-Cloudflared $useProxy
  Start-Sleep -Seconds 18
  $public = Test-Http "$PublicUrl/api/health" 10
  if ($public.ok) { break }
  Write-Warn "Tunnel attempt failed: $($public.error)"
}

$cloudflaredTail = Get-LogTail (Join-Path $Root "cloudflared.err.log")
$dnsTail = Get-LogTail (Join-Path $Root "cloudflared-dns.err.log")

if ($public.ok) {
  Save-Status @{
    local = @{ ok = $true; url = "http://localhost:3001"; health = $local.body }
    public = @{ ok = $true; url = $PublicUrl; health = $public.body }
    logs = @{
      cloudflared = "cloudflared.err.log"
      dns = "cloudflared-dns.err.log"
    }
    nextStep = "Open the public URL and test WhatsApp QR/social OAuth callback."
  }
  Write-Host ""
  Write-Host "LIVE: $PublicUrl" -ForegroundColor Green
  Write-Host $public.body
} else {
  Save-Status @{
    local = @{ ok = $true; url = "http://localhost:3001"; health = $local.body }
    public = @{ ok = $false; url = $PublicUrl; error = $public.error; statusCode = $public.statusCode }
    logs = @{
      cloudflaredTail = $cloudflaredTail
      dnsTail = $dnsTail
      cloudflared = "cloudflared.err.log"
      dns = "cloudflared-dns.err.log"
    }
    nextStep = "Your local server is fine. Cloudflare tunnel is blocked by DNS/proxy on this network. Switch to mobile hotspot or set working DNS/proxy, then rerun: powershell -ExecutionPolicy Bypass -File scripts\\go-live.ps1"
  }
  Write-Host ""
  Write-Host "Local server is running, but public tunnel is not reachable yet." -ForegroundColor Yellow
  Write-Host "Reason: $($public.error)" -ForegroundColor Yellow
  Write-Host "Most common fix: switch PC to mobile hotspot or fix LAN DNS/proxy, then run this script again." -ForegroundColor Yellow
  Write-Host "Logs: cloudflared.err.log, cloudflared-dns.err.log" -ForegroundColor Yellow
  Write-Host "Status file: $StatusPath" -ForegroundColor Yellow
}
