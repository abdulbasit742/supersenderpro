param(
  [string]$ProjectRoot = "D:\SuperSenderPro\supersender-pro-final",
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$node = Join-Path $ProjectRoot "node-local.exe"
$server = Join-Path $ProjectRoot "server.js"
$logs = Join-Path $ProjectRoot "logs"

New-Item -ItemType Directory -Path $logs -Force | Out-Null

if (!(Test-Path $node)) {
  throw "node-local.exe not found at $node"
}

if (!(Test-Path $server)) {
  throw "server.js not found at $server"
}

$existing = Get-Process -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessName -eq "node-local" -and $_.Path -eq $node
}

if ($existing) {
  Write-Host "SuperSender Pro server already running: $($existing.Id -join ', ')"
  exit 0
}

$out = Join-Path $logs "supersender-live.out.log"
$err = Join-Path $logs "supersender-live.err.log"

Start-Process -FilePath $node `
  -ArgumentList "server.js" `
  -WorkingDirectory $ProjectRoot `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err `
  -WindowStyle Hidden

Start-Sleep -Seconds 4

try {
  $health = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 8
  Write-Host "SuperSender Pro server started. Health HTTP $($health.StatusCode)"
} catch {
  Write-Warning "Server started but health check did not respond yet. Check $err"
}

