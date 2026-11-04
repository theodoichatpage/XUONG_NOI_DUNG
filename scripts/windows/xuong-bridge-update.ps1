# Xuong ChatGPT Bridge - auto update (Windows).
# Checks the published Bridge release; when a newer version exists it downloads the ZIP,
# verifies SHA-256 and copies the files into the installed extension folder.
# The extension notices the new files and reloads itself. Nothing else on the PC is changed.
param(
  [Parameter(Mandatory = $true)][string]$Dest,
  [string]$Base = 'https://xuong-noi-dung-khaki.vercel.app/downloads/'
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$log = Join-Path $PSScriptRoot 'update.log'
function Write-Log($msg) { Add-Content -Path $log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg) -Encoding UTF8 }
function Version-Key($v) { ($v -split '\.' | ForEach-Object { '{0:D6}' -f [int]$_ }) -join '.' }
$tmp = $null
try {
  if (-not (Test-Path (Join-Path $Dest 'manifest.json'))) { throw "Khong thay manifest.json trong $Dest" }
  $current = (Get-Content (Join-Path $Dest 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $rel = Invoke-RestMethod -Uri ($Base + 'bridge-release.json?t=' + $stamp) -UseBasicParsing -TimeoutSec 30
  if (-not $rel.version -or -not $rel.filename -or -not $rel.sha256) { throw 'bridge-release.json thieu thong tin' }
  if ((Version-Key $rel.version) -le (Version-Key $current)) { exit 0 }
  $tmp = Join-Path $env:TEMP ('xuong_bridge_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'bridge.zip'
  Invoke-WebRequest -Uri ($Base + $rel.filename + '?t=' + $stamp) -OutFile $zip -UseBasicParsing -TimeoutSec 120
  $hash = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLower()
  if ($hash -ne $rel.sha256.ToLower()) { throw "SHA-256 khong khop ($hash)" }
  Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'x') -Force
  $src = Join-Path (Join-Path $tmp 'x') $rel.folder
  $files = @($rel.files | Where-Object { $_ -notmatch '[\\/]' -and $_ -ne 'manifest.json' })
  foreach ($f in $files) { if (-not (Test-Path (Join-Path $src $f))) { throw "Goi thieu file $f" } }
  # Copy manifest.json last: the extension reloads when the manifest version changes.
  foreach ($f in $files) { Copy-Item -Path (Join-Path $src $f) -Destination (Join-Path $Dest $f) -Force }
  Copy-Item -Path (Join-Path $src 'manifest.json') -Destination (Join-Path $Dest 'manifest.json') -Force
  Write-Log "Da cap nhat $current -> $($rel.version)"
} catch {
  Write-Log ('Loi: ' + $_.Exception.Message)
  exit 1
} finally {
  if ($tmp -and (Test-Path $tmp)) { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
