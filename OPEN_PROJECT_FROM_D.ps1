Set-Location -LiteralPath 'D:\SuperSenderPro\supersender-pro-final'

Write-Host "SuperSender Pro project path:" -ForegroundColor Cyan
Write-Host (Get-Location).Path
Write-Host ""

Write-Host "Starting local server on http://localhost:3001 ..." -ForegroundColor Green
$existing = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like '*D:\SuperSenderPro\supersender-pro-final*server.js*' -and
  $_.CommandLine -notlike '*--check*'
}
if (-not $existing) {
  Start-Process -FilePath '.\node-local.exe' `
    -ArgumentList 'server.js' `
    -WorkingDirectory 'D:\SuperSenderPro\supersender-pro-final' `
    -RedirectStandardOutput 'D:\SuperSenderPro\supersender-pro-final\server-runtime.out' `
    -RedirectStandardError 'D:\SuperSenderPro\supersender-pro-final\server-runtime.err' `
    -WindowStyle Hidden
  Start-Sleep -Seconds 8
} else {
  Write-Host "Server already running." -ForegroundColor Yellow
}

try {
  $health = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 10
  Write-Host "Health OK:" -ForegroundColor Green
  Write-Host $health.Content
} catch {
  Write-Host "Health check failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "Open:" -ForegroundColor Cyan
Write-Host "  http://localhost:3001"
Write-Host "  http://localhost:3001/wa-channel-qr"
