# Install (or remove) the Xuong ChatGPT Bridge auto-updater for the current Windows user.
# Usage:  powershell -ExecutionPolicy Bypass -File install-bridge-updater.ps1 -Dest "C:\...\Xuong_ChatGPT_Bridge"
#         powershell -ExecutionPolicy Bypass -File install-bridge-updater.ps1 -Remove
# Creates a per-user scheduled task "XuongBridgeUpdater" (every 15 minutes, no admin rights).
param([string]$Dest, [switch]$Remove)
$ErrorActionPreference = 'Stop'
$task = 'XuongBridgeUpdater'
$home2 = Join-Path $env:LOCALAPPDATA 'XuongBridgeUpdater'
if ($Remove) {
  schtasks /Delete /TN $task /F 2>$null | Out-Null
  if (Test-Path $home2) { Remove-Item $home2 -Recurse -Force }
  Write-Output 'Da go trinh tu cap nhat Bridge.'
  exit 0
}
if (-not $Dest -or -not (Test-Path (Join-Path $Dest 'manifest.json'))) { throw 'Chon dung thu muc Xuong_ChatGPT_Bridge dang cai (co manifest.json).' }
$Dest = (Resolve-Path $Dest).Path
New-Item -ItemType Directory -Path $home2 -Force | Out-Null
Copy-Item -Path (Join-Path $PSScriptRoot 'xuong-bridge-update.ps1') -Destination (Join-Path $home2 'xuong-bridge-update.ps1') -Force
# Hidden launcher so no console window flashes.
$cmd = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $home2 'xuong-bridge-update.ps1') + '" -Dest "' + $Dest + '"'
$vbs = 'CreateObject("WScript.Shell").Run "' + $cmd.Replace('"', '""') + '", 0, False'
Set-Content -Path (Join-Path $home2 'run-hidden.vbs') -Value $vbs -Encoding ASCII
$run = 'wscript.exe "' + (Join-Path $home2 'run-hidden.vbs') + '"'
schtasks /Create /TN $task /TR $run /SC MINUTE /MO 15 /F | Out-Null
schtasks /Run /TN $task | Out-Null
Write-Output "Da cai trinh tu cap nhat Bridge cho thu muc: $Dest"
