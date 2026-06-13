param(
  [string]$PartsDir = ".\private-backup-encrypted",
  [string]$OutZip = ".\supersenderpro-private-restored.zip",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $PartsDir)) {
  throw "Encrypted parts folder not found: $PartsDir"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $secure = Read-Host "Enter private backup password" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Get-Pbkdf2Key([string]$Password, [byte[]]$Salt, [int]$Iterations, [int]$Bytes) {
  try {
    $kdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
      $Password,
      $Salt,
      $Iterations,
      [System.Security.Cryptography.HashAlgorithmName]::SHA256
    )
  } catch {
    $kdf = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Password, $Salt, $Iterations)
  }
  try { return $kdf.GetBytes($Bytes) } finally { $kdf.Dispose() }
}

function Decrypt-File([string]$InputPath, [string]$OutputPath, [string]$Password) {
  $input = [System.IO.File]::OpenRead($InputPath)
  try {
    $magic = New-Object byte[] 8
    if ($input.Read($magic, 0, 8) -ne 8) { throw "Invalid encrypted file: $InputPath" }
    $magicText = [System.Text.Encoding]::ASCII.GetString($magic)
    if ($magicText -ne "SSPENC01") { throw "Invalid encrypted header: $InputPath" }

    $iterBytes = New-Object byte[] 4
    [void]$input.Read($iterBytes, 0, 4)
    $iterations = [System.BitConverter]::ToInt32($iterBytes, 0)

    $salt = New-Object byte[] 16
    $iv = New-Object byte[] 16
    [void]$input.Read($salt, 0, 16)
    [void]$input.Read($iv, 0, 16)

    $key = Get-Pbkdf2Key $Password $salt $iterations 32
    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Key = $key
    $aes.IV = $iv
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7

    $output = [System.IO.File]::Create($OutputPath)
    try {
      $decryptor = $aes.CreateDecryptor()
      $crypto = New-Object System.Security.Cryptography.CryptoStream($input, $decryptor, [System.Security.Cryptography.CryptoStreamMode]::Read)
      try {
        $buffer = New-Object byte[] (1024 * 1024)
        while (($read = $crypto.Read($buffer, 0, $buffer.Length)) -gt 0) {
          $output.Write($buffer, 0, $read)
        }
      } finally {
        $crypto.Dispose()
        $decryptor.Dispose()
      }
    } finally {
      $output.Dispose()
      $aes.Dispose()
    }
  } finally {
    $input.Dispose()
  }
}

$parts = Get-ChildItem -LiteralPath $PartsDir -Filter "*.enc" | Sort-Object Name
if (-not $parts) { throw "No .enc parts found in $PartsDir" }

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("ssp-private-restore-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
  $plainParts = @()
  foreach ($part in $parts) {
    $plain = Join-Path $tempDir ($part.BaseName -replace "\.enc$", "")
    Write-Host "Decrypting $($part.Name)..."
    Decrypt-File $part.FullName $plain $Password
    $plainParts += $plain
  }

  if (Test-Path -LiteralPath $OutZip) { Remove-Item -LiteralPath $OutZip -Force }
  $out = [System.IO.File]::Create((Resolve-Path -LiteralPath (Split-Path -Parent $OutZip)).Path + "\" + (Split-Path -Leaf $OutZip))
  try {
    foreach ($plain in $plainParts) {
      $bytes = [System.IO.File]::ReadAllBytes($plain)
      $out.Write($bytes, 0, $bytes.Length)
    }
  } finally {
    $out.Dispose()
  }

  Write-Host "Restored zip: $OutZip"
  Get-FileHash -LiteralPath $OutZip -Algorithm SHA256
} finally {
  Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
