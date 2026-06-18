param(
  [string]$ProjectRoot = "D:\SuperSenderPro\supersender-pro-final",
  [string]$TaskName = "SuperSenderPro-Server"
)

$ErrorActionPreference = "Stop"

$startScript = Join-Path $ProjectRoot "scripts\live\start-supersender-server.ps1"
if (!(Test-Path $startScript)) {
  throw "Startup script not found: $startScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""

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
  -Description "Starts SuperSender Pro local server and Claw Runtime Hub on Windows login." `
  -Force | Out-Null

Write-Host "Registered Windows startup task: $TaskName"
Write-Host "Run now:"
Write-Host "  Start-ScheduledTask -TaskName `"$TaskName`""

