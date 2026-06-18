param(
  [string]$RuntimeRoot = "D:\SuperSenderPro\agent-runtime",
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"

$sources = Join-Path $RuntimeRoot "sources"
New-Item -ItemType Directory -Path $sources -Force | Out-Null

$repos = @(
  @{ Name = "zeroclaw"; Url = "https://github.com/zeroclaw-labs/zeroclaw.git" },
  @{ Name = "awesome-claws"; Url = "https://github.com/machinae/awesome-claws.git" }
)

foreach ($repo in $repos) {
  $target = Join-Path $sources $repo.Name
  if (Test-Path $target) {
    if ($Refresh) {
      git -C $target pull --ff-only
    }
  } else {
    git clone --depth 1 $repo.Url $target
  }
}

$configDir = Join-Path $RuntimeRoot "config"
New-Item -ItemType Directory -Path $configDir -Force | Out-Null

$policyFile = Join-Path $configDir "supersender-policy.json"
$policy = [ordered]@{
  mode = "supervised"
  livePcActionsEnabled = $false
  dryRunDefault = $true
  allowedWorkspaces = @(
    "D:\SuperSenderPro\supersender-pro-final",
    "D:\SuperSenderPro\repo-ready-to-push",
    "D:\SuperSenderPro\agent-runtime"
  )
  approvalRequired = @(
    "filesystem_write",
    "shell_command",
    "browser_action",
    "whatsapp_send",
    "social_publish",
    "payment_delivery",
    "git_push"
  )
  blockedActions = @(
    "delete_files",
    "format_disk",
    "credential_dump",
    "cold_broadcast",
    "payment_approve_live",
    "social_post_live_without_approval"
  )
}

$policy | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $policyFile -Encoding UTF8

Write-Host "Claw runtime sources ready:" -ForegroundColor Green
Write-Host "  $sources"
Write-Host "Policy file:"
Write-Host "  $policyFile"
Write-Host ""
Write-Host "Next manual ZeroClaw setup, if you want the binary:"
Write-Host "  cd /d $(Join-Path $sources 'zeroclaw')"
Write-Host "  setup.bat"
Write-Host "  zeroclaw quickstart"

