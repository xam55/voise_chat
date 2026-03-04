param(
  [Parameter(Mandatory = $true)]
  [string]$RailwayToken,
  [Parameter(Mandatory = $true)]
  [string]$SignalApiToken
)

$ErrorActionPreference = "Stop"

$railwayCmd = Join-Path $env:APPDATA "npm\railway.cmd"
$nodeDir = "C:\Program Files\nodejs"
$env:Path = "$nodeDir;$env:Path"

if (!(Test-Path $railwayCmd)) {
  throw "Railway CLI is not installed. Install: C:\Program Files\nodejs\npm.cmd i -g @railway/cli"
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:RAILWAY_TOKEN = $RailwayToken

Write-Host "Setting SIGNAL_API_TOKEN variable..."
& $railwayCmd variables set SIGNAL_API_TOKEN=$SignalApiToken

Write-Host "Deploying current project..."
& $railwayCmd up

Write-Host "Railway deploy finished"
