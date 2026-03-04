param(
  [string]$Target = "x86_64-pc-windows-msvc"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Building NexusChat portable artifacts for $Target..."

cargo build -p signal-server --release --target $Target
cargo build -p nexuschat-client --release --target $Target

$dist = Join-Path $root "dist"
if (Test-Path $dist) {
  Remove-Item -Recurse -Force $dist
}
New-Item -ItemType Directory -Path $dist | Out-Null

Copy-Item "target/$Target/release/signal-server.exe" "$dist/signal-server.exe"
Copy-Item "target/$Target/release/nexuschat-client.exe" "$dist/nexuschat-client.exe"

$zipPath = Join-Path $root "NexusChat-portable-$Target.zip"
if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}
Compress-Archive -Path "$dist/*" -DestinationPath $zipPath

Write-Host "Done: $zipPath"
