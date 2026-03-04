param(
  [string]$ServerHost = "127.0.0.1",
  [int]$Port = 18080
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverExe = Join-Path $root "target\x86_64-pc-windows-msvc\release\signal-server.exe"

if (!(Test-Path $serverExe)) {
  throw "signal-server.exe not found: $serverExe. Run scripts/build-portable.ps1 first."
}

$base = "http://${ServerHost}:${Port}"
Write-Host "Smoke test: starting server on $base"

$serverLog = Join-Path $root "smoke-server.log"
$serverErr = Join-Path $root "smoke-server.err.log"
if (Test-Path $serverLog) { Remove-Item -Force $serverLog }
if (Test-Path $serverErr) { Remove-Item -Force $serverErr }

$prevBind = $env:BIND_ADDR
$env:BIND_ADDR = "${ServerHost}:${Port}"
$proc = Start-Process -FilePath $serverExe -PassThru -WindowStyle Hidden -RedirectStandardOutput $serverLog -RedirectStandardError $serverErr

try {
  Start-Sleep -Seconds 2

  $health = Invoke-RestMethod -Uri "$base/health" -Method Get
  if ($health -ne "ok") { throw "health check failed: $health" }

  $registerBody = @{
    key = "NX-ABC123"
    endpoint = "127.0.0.1:5000"
    sdp_offer = $null
  } | ConvertTo-Json

  $register = Invoke-RestMethod -Uri "$base/v1/register" -Method Post -ContentType "application/json" -Body $registerBody
  if (-not $register.ok) { throw "register failed" }

  $resolve = Invoke-RestMethod -Uri "$base/v1/resolve/NX-ABC123" -Method Get
  if ($resolve.key -ne "NX-ABC123") { throw "resolve returned wrong key" }

  $offerBody = @{
    caller_key = "NX-AAAA11"
    callee_key = "NX-BBBB22"
    sdp_offer = "v=0"
  } | ConvertTo-Json
  $offer = Invoke-RestMethod -Uri "$base/v1/sessions/offer" -Method Post -ContentType "application/json" -Body $offerBody
  if (-not $offer.session_id) { throw "offer has no session_id" }

  $answerBody = @{
    callee_key = "NX-BBBB22"
    sdp_answer = "v=0-answer"
  } | ConvertTo-Json
  $answer = Invoke-RestMethod -Uri "$base/v1/sessions/$($offer.session_id)/answer" -Method Post -ContentType "application/json" -Body $answerBody
  if ($answer.state -ne "connected") { throw "session is not connected after answer" }

  $session = Invoke-RestMethod -Uri "$base/v1/sessions/$($offer.session_id)" -Method Get
  if ($session.state -ne "connected") { throw "get session mismatch" }

  Write-Host "Smoke test passed"
}
finally {
  if ($proc -and !$proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
  if ($null -eq $prevBind) {
    Remove-Item Env:\BIND_ADDR -ErrorAction SilentlyContinue
  } else {
    $env:BIND_ADDR = $prevBind
  }
}
