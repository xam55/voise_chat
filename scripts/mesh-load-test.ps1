param(
  [string]$BaseUrl = "http://127.0.0.1:18080",
  [switch]$StartLocalServer
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  param([string]$Url, [hashtable]$Body)
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $json -TimeoutSec 8
}

function Invoke-JsonGet {
  param([string]$Url)
  return Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 8
}

function Wait-Health {
  param([string]$HealthUrl)
  for ($i = 0; $i -lt 20; $i += 1) {
    try {
      $r = Invoke-JsonGet -Url $HealthUrl
      if ($r.ok -eq $true) { return }
    } catch {}
    Start-Sleep -Milliseconds 250
  }
  throw "health check failed: $HealthUrl"
}

$root = Split-Path -Parent $PSScriptRoot
$localServer = $null
$stdout = Join-Path $root "mesh-load-server.log"
$stderr = Join-Path $root "mesh-load-server.err.log"

try {
  if ($StartLocalServer) {
    $serverScript = Join-Path $root "..\nexus_light_signal.py"
    if (!(Test-Path $serverScript)) {
      throw "nexus_light_signal.py not found: $serverScript"
    }
    if (Test-Path $stdout) { Remove-Item -Force $stdout }
    if (Test-Path $stderr) { Remove-Item -Force $stderr }
    $localServer = Start-Process -FilePath "py" -ArgumentList @("-3", $serverScript) -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  }

  $base = $BaseUrl.TrimEnd("/")
  Wait-Health -HealthUrl "$base/health"

  $stamp = Get-Date -Format "yyyyMMddHHmmss"
  $groupId = "load_$stamp"
  $channel = "voice-1"
  $chatChannel = "loadchat_${groupId}_${channel}"
  $creator = "NX-A00001"
  $users = 1..10 | ForEach-Object { "NX-A{0:D5}" -f $_ }
  $nickMap = @{}
  $users | ForEach-Object {
    $nickMap[$_] = "u$($_.Substring(5))"
  }

  # Register all users in online state.
  foreach ($u in $users) {
    $null = Invoke-JsonPost -Url "$base/v1/register" -Body @{
      key = $u
      endpoint = "online"
      nick = $nickMap[$u]
      sdp_offer = $null
    }
  }

  # Upsert one group with 10 members and one voice/text channel.
  $null = Invoke-JsonPost -Url "$base/v1/groups/upsert" -Body @{
    group = @{
      id = $groupId
      name = "load-group-$stamp"
      creator_code = $creator
      member_codes = $users
      text_channels = @("general")
      voice_channels = @($channel)
    }
  }

  # Mark all users in one voice channel.
  foreach ($u in $users) {
    $null = Invoke-JsonPost -Url "$base/v1/register" -Body @{
      key = $u
      endpoint = "group:${groupId}:${channel}:${u}"
      nick = $nickMap[$u]
      sdp_offer = $null
    }
  }

  # Verify resolve endpoint for all users.
  foreach ($u in $users) {
    $resolved = Invoke-JsonGet -Url "$base/v1/resolve/$u"
    if (-not $resolved.endpoint -or -not ($resolved.endpoint -like "group:${groupId}:${channel}:*")) {
      throw "resolve endpoint mismatch for ${u}: $($resolved.endpoint)"
    }
  }

  # Simulate mesh signaling: one offer per pair (lexicographic initiator), then answer.
  $pairs = @()
  for ($i = 0; $i -lt $users.Count; $i += 1) {
    for ($j = $i + 1; $j -lt $users.Count; $j += 1) {
      $pairs += ,@($users[$i], $users[$j])
    }
  }

  $sessionsCreated = 0
  foreach ($pair in $pairs) {
    $caller = $pair[0]
    $callee = $pair[1]
    $offer = Invoke-JsonPost -Url "$base/v1/sessions/offer" -Body @{
      caller_key = $caller
      callee_key = $callee
      sdp_offer = "v=0`r`no=- 1 1 IN IP4 127.0.0.1`r`ns=-`r`nt=0 0`r`nm=audio 9 UDP/TLS/RTP/SAVPF 111`r`na=mid:0`r`na=sendrecv`r`n"
      context = @{
        mode = "group"
        server_id = $groupId
        channel = $channel
      }
    }
    if (-not $offer.session_id) { throw "session_id missing for $caller->$callee" }

    $null = Invoke-JsonPost -Url "$base/v1/sessions/$($offer.session_id)/answer" -Body @{
      key = $callee
      callee_key = $callee
      sdp_answer = "v=0`r`no=- 2 2 IN IP4 127.0.0.1`r`ns=-`r`nt=0 0`r`nm=audio 9 UDP/TLS/RTP/SAVPF 111`r`na=mid:0`r`na=sendrecv`r`n"
    }

    $session = Invoke-JsonGet -Url "$base/v1/sessions/$($offer.session_id)?key=$caller"
    if (-not $session.sdp_answer) { throw "answer missing in session $($offer.session_id)" }
    $sessionsCreated += 1
  }

  # Group text chat stress: 10 messages from 10 users and history read.
  $lastChatSend = $null
  foreach ($u in $users) {
    $lastChatSend = Invoke-JsonPost -Url "$base/v1/chat/send" -Body @{
      channel_id = $chatChannel
      author_code = $u
      author_nick = $nickMap[$u]
      text = "mesh-load message from $u"
      ts = [int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
    }
  }
  $hist = Invoke-JsonGet -Url "$base/v1/chat/history/${chatChannel}?limit=100"
  $msgCount = @($hist.messages).Count
  if ($msgCount -lt 10) {
    Write-Host "DEBUG chat send response:"
    Write-Host ($lastChatSend | ConvertTo-Json -Depth 10)
    Write-Host "DEBUG chat history response:"
    Write-Host ($hist | ConvertTo-Json -Depth 10)
    throw "chat history too short: $msgCount"
  }

  # Cleanup group to avoid stale test data.
  $null = Invoke-JsonPost -Url "$base/v1/groups/delete" -Body @{
    group_id = $groupId
    requester_code = $creator
  }

  Write-Host ("Mesh load test passed: users={0}, pairs={1}, sessions={2}, chat_messages={3}" -f $users.Count, $pairs.Count, $sessionsCreated, $msgCount)
}
finally {
  if ($localServer -and !$localServer.HasExited) {
    Stop-Process -Id $localServer.Id -Force
  }
}
