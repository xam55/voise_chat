param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$SignalApiToken
)

$ErrorActionPreference = "Stop"

$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
if ($health -ne "ok") {
  throw "Health check failed: $health"
}

$headers = @{ "x-nexus-token" = $SignalApiToken }
$metrics = Invoke-RestMethod -Uri "$BaseUrl/metrics" -Method Get -Headers $headers

if ($null -eq $metrics.total_requests) {
  throw "Metrics check failed"
}

Write-Host "Deploy check passed"
