$ErrorActionPreference = 'Stop'

$threadId = '019de8d4-e04b-7bb2-bba0-5ef84a1b01df'
$codexHome = Join-Path $env:USERPROFILE '.codex'
$backupRoot = 'D:\SuperSenderPro\codex-session-backups'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $backupRoot $stamp

Write-Host "Fixing Codex stale running thread: $threadId" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will close Codex, back up the stale session, and remove stale UI references." -ForegroundColor Yellow
Write-Host "Your SuperSender project files will NOT be deleted." -ForegroundColor Green
Write-Host ""

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Closing Codex processes..." -ForegroundColor Cyan
Get-Process -Name 'Codex','codex' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

$sessionFiles = Get-ChildItem -LiteralPath (Join-Path $codexHome 'sessions') -Recurse -Filter "*$threadId*.jsonl" -ErrorAction SilentlyContinue
foreach ($file in $sessionFiles) {
  $backupPath = Join-Path $backupDir $file.Name
  Write-Host "Backing up session:" $file.FullName
  Copy-Item -LiteralPath $file.FullName -Destination $backupPath -Force
  $disabledPath = "$($file.FullName).stale-backup-$stamp"
  Move-Item -LiteralPath $file.FullName -Destination $disabledPath -Force
  Write-Host "Disabled stale session:" $disabledPath -ForegroundColor Green
}

$globalState = Join-Path $codexHome '.codex-global-state.json'
if (Test-Path -LiteralPath $globalState) {
  $globalBackup = Join-Path $backupDir '.codex-global-state.json.bak'
  Copy-Item -LiteralPath $globalState -Destination $globalBackup -Force
  $json = Get-Content -LiteralPath $globalState -Raw | ConvertFrom-Json
  $state = $json.'electron-persisted-atom-state'
  if ($state) {
    if ($state.'prompt-history' -and $state.'prompt-history'.PSObject.Properties.Name -contains $threadId) {
      $state.'prompt-history'.PSObject.Properties.Remove($threadId)
      Write-Host "Removed prompt-history stale thread reference." -ForegroundColor Green
    }
    if ($state.'heartbeat-thread-permissions-by-id' -and $state.'heartbeat-thread-permissions-by-id'.PSObject.Properties.Name -contains $threadId) {
      $state.'heartbeat-thread-permissions-by-id'.PSObject.Properties.Remove($threadId)
      Write-Host "Removed heartbeat stale thread reference." -ForegroundColor Green
    }
  }
  $json | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $globalState -Encoding UTF8
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "Backup folder: $backupDir"
Write-Host ""
Write-Host "Now open Codex again and open project from:"
Write-Host "D:\SuperSenderPro\supersender-pro-final" -ForegroundColor Cyan
Write-Host ""
Write-Host "Start server if needed:"
Write-Host 'powershell -ExecutionPolicy Bypass -File "D:\SuperSenderPro\supersender-pro-final\OPEN_PROJECT_FROM_D.ps1"'
