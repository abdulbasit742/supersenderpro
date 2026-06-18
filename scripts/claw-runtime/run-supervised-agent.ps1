param(
  [string]$Agent = "zeroclaw",
  [string]$Goal = "Check SuperSender project health and suggest the next safe automation step.",
  [string]$ServerUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"

$payload = @{
  agent = $Agent
  goal = $Goal
  source = "powershell-helper"
  dryRun = $true
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod -Uri "$ServerUrl/api/claw-runtime/queue" -Method Post -ContentType "application/json" -Body $payload

Write-Host "Queued Claw runtime task:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 12

