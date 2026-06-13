param(
  [string]$Source = "D:\SuperSenderPro\supersender-pro-final",
  [string]$OutDir = "D:\SuperSenderPro\private-backups",
  [switch]$Split,
  [int]$SplitMB = 95
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source folder not found: $Source"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$folderName = Split-Path -Leaf $Source
if ([string]::IsNullOrWhiteSpace($folderName)) { $folderName = "supersender-pro-full" }
$zipPath = Join-Path $OutDir "$folderName-PRIVATE-EVERYTHING-$timestamp.zip"

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archiveExtensions = @(".zip", ".7z", ".rar")
$skipped = New-Object System.Collections.Generic.List[string]
$included = 0
$excluded = 0

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $notice = $zip.CreateEntry("PRIVATE_BACKUP_NOTICE.txt")
  $noticeWriter = New-Object System.IO.StreamWriter($notice.Open())
  $noticeWriter.WriteLine("PRIVATE FULL BACKUP.")
  $noticeWriter.WriteLine("Contains secrets and live runtime files if present: .env, .git, WhatsApp sessions, data, uploads, node_modules, tools.")
  $noticeWriter.WriteLine("Do not upload this archive to public GitHub, Lovable, public hosting, or send it to anyone.")
  $noticeWriter.WriteLine("Some locked live browser cache/metrics files may be skipped while WhatsApp/Chrome is running.")
  $noticeWriter.Dispose()

  $files = Get-ChildItem -LiteralPath $Source -Recurse -File -Force -ErrorAction SilentlyContinue
  foreach ($file in $files) {
    $rel = $file.FullName.Substring($Source.Length).TrimStart("\")

    if ($archiveExtensions -contains $file.Extension.ToLowerInvariant()) {
      $excluded++
      $skipped.Add("$rel :: old archive file skipped") | Out-Null
      continue
    }

    $entryName = "$folderName/" + ($rel -replace "\\", "/")
    try {
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip,
        $file.FullName,
        $entryName,
        [System.IO.Compression.CompressionLevel]::Fastest
      ) | Out-Null
      $included++
    } catch {
      $excluded++
      $skipped.Add("$rel :: $($_.Exception.Message)") | Out-Null
    }
  }

  $manifest = $zip.CreateEntry("BACKUP_MANIFEST.txt")
  $manifestWriter = New-Object System.IO.StreamWriter($manifest.Open())
  $manifestWriter.WriteLine("Created: $timestamp")
  $manifestWriter.WriteLine("Source: $Source")
  $manifestWriter.WriteLine("Included files: $included")
  $manifestWriter.WriteLine("Skipped files: $excluded")
  $manifestWriter.WriteLine("")
  $manifestWriter.WriteLine("Skipped list:")
  foreach ($item in $skipped) {
    $manifestWriter.WriteLine("- $item")
  }
  $manifestWriter.Dispose()
} finally {
  $zip.Dispose()
}

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashPath = Join-Path $OutDir "$folderName-PRIVATE-EVERYTHING-$timestamp.sha256.txt"
"$($hash.Hash)  $([System.IO.Path]::GetFileName($zipPath))" | Set-Content -LiteralPath $hashPath -Encoding UTF8

if ($Split) {
  $chunkSize = [int64]$SplitMB * 1MB
  if ($chunkSize -lt 1MB) { throw "SplitMB must be at least 1" }

  $splitDir = Join-Path $OutDir "$folderName-PRIVATE-EVERYTHING-$timestamp-parts"
  New-Item -ItemType Directory -Force -Path $splitDir | Out-Null

  $buffer = New-Object byte[] $chunkSize
  $inputStream = [System.IO.File]::OpenRead($zipPath)
  try {
    $part = 1
    while (($read = $inputStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $partPath = Join-Path $splitDir ("{0}.part{1:D3}" -f ([System.IO.Path]::GetFileName($zipPath)), $part)
      $outputStream = [System.IO.File]::Create($partPath)
      try {
        $outputStream.Write($buffer, 0, $read)
      } finally {
        $outputStream.Dispose()
      }
      $part++
    }
  } finally {
    $inputStream.Dispose()
  }

  $joinScript = Join-Path $splitDir "JOIN_PARTS.ps1"
  @"
`$parts = Get-ChildItem -LiteralPath `"$splitDir`" -Filter `"*.part*`" | Sort-Object Name
`$out = Join-Path `"$splitDir`" `"$([System.IO.Path]::GetFileName($zipPath))`"
if (Test-Path -LiteralPath `$out) { Remove-Item -LiteralPath `$out -Force }
`$stream = [System.IO.File]::Create(`$out)
try {
  foreach (`$p in `$parts) {
    `$bytes = [System.IO.File]::ReadAllBytes(`$p.FullName)
    `$stream.Write(`$bytes, 0, `$bytes.Length)
  }
} finally {
  `$stream.Dispose()
}
Get-FileHash -LiteralPath `$out -Algorithm SHA256
"@ | Set-Content -LiteralPath $joinScript -Encoding UTF8
}

[pscustomobject]@{
  Zip = $zipPath
  HashFile = $hashPath
  SizeMB = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)
  IncludedFiles = $included
  SkippedFiles = $excluded
  SplitFolder = $(if ($Split) { $splitDir } else { "" })
}
