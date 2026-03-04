param(
  [Parameter(Mandatory = $true)]
  [string]$CertPath,
  [Parameter(Mandatory = $true)]
  [string]$CertPassword,
  [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"

if (!(Test-Path $dist)) {
  throw "dist not found: $dist. Run scripts/build-portable.ps1 first."
}

$signtool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe"
if (!(Test-Path $signtool)) {
  throw "signtool not found: $signtool"
}

$targets = @(
  (Join-Path $dist "signal-server.exe"),
  (Join-Path $dist "nexuschat-client.exe")
)

foreach ($file in $targets) {
  if (!(Test-Path $file)) {
    throw "file not found: $file"
  }

  & $signtool sign /fd SHA256 /f $CertPath /p $CertPassword /tr $TimestampUrl /td SHA256 $file
  if ($LASTEXITCODE -ne 0) {
    throw "sign failed for $file"
  }
}

Write-Host "Signing complete"
