param(
  [string]$ProjectRoot = "D:\SuperSenderPro\supersender-pro-final",
  [int]$Port = 3001,
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Stop"

$logs = Join-Path $ProjectRoot "logs"
$startScript = Join-Path $ProjectRoot "scripts\live\start-supersender-server.ps1"
$watchLog = Join-Path $logs "supersender-watchdog.log"
$mutexName = "Global\SuperSenderProLiveWatchdog"

New-Item -ItemType Directory -Path $logs -Force | Out-Null

function Write-WatchLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $watchLog -Value $line -Encoding UTF8
}

function Test-SuperSenderHealth {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 8
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (!(Test-Path $startScript)) {
  throw "Start script not found: $startScript"
}

$mutex = New-Object System.Threading.Mutex($false, $mutexName)
$hasLock = $mutex.WaitOne(0, $false)
if (!$hasLock) {
  Write-WatchLog "Another watchdog is already running. Exiting duplicate instance."
  exit 0
}

try {
  Write-WatchLog "Watchdog started for $ProjectRoot on port $Port. Interval: $IntervalSeconds seconds."

  while ($true) {
    if (Test-SuperSenderHealth) {
      Write-WatchLog "Health OK."
    } else {
      Write-WatchLog "Health check failed. Starting/restarting SuperSender server."
      try {
        & $startScript -ProjectRoot $ProjectRoot -Port $Port | ForEach-Object { Write-WatchLog $_ }
      } catch {
        Write-WatchLog "Restart attempt failed: $($_.Exception.Message)"
      }
    }

    Start-Sleep -Seconds $IntervalSeconds
  }
} finally {
  if ($hasLock) {
    $mutex.ReleaseMutex() | Out-Null
    $mutex.Dispose()
  }
}
