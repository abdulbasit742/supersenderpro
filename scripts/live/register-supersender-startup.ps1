param(
  [string]$ProjectRoot = "D:\SuperSenderPro\supersender-pro-final",
  [string]$TaskName = "SuperSenderPro-Server"
)

$ErrorActionPreference = "Stop"

$watchScript = Join-Path $ProjectRoot "scripts\live\watch-supersender-live.ps1"
if (!(Test-Path $watchScript)) {
  throw "Watchdog script not found: $watchScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchScript`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Keeps SuperSender Pro local server and Claw Runtime Hub alive on Windows login." `
  -Force | Out-Null

Write-Host "Registered Windows startup task: $TaskName"
Write-Host "Run now:"
Write-Host "  Start-ScheduledTask -TaskName `"$TaskName`""
