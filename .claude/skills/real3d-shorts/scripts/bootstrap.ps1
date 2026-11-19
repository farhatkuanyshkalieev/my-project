# Установка всего нужного на Windows — у пользователя есть только Blender (+ MCP-мост). Без прав администратора.
#   powershell -ExecutionPolicy Bypass -File bootstrap.ps1 [-Blender "C:\...\blender.exe"]
# Ставит (если нет): Node.js LTS, ffmpeg — через winget, а без него портативно в %USERPROFILE%\.real3d-shorts\bin.
# Затем: MPFB + пакет MakeHuman в Blender, базовые ассеты Poly Haven. Печатает итог ✅/❌ и строки PATH_ADD / BLENDER_PATH.
param([string]$Blender = "")
$ErrorActionPreference = "Stop"
$Home3D = Join-Path $env:USERPROFILE ".real3d-shorts"
$Bin = Join-Path $Home3D "bin"
New-Item -ItemType Directory -Force $Bin | Out-Null
$Skill = Split-Path -Parent $PSScriptRoot
function Ok($m) { Write-Host "✅ $m" }
function Bad($m) { Write-Host "❌ $m" }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + $env:Path }
function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
$HasWinget = Has "winget"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ── Node.js ──
Refresh-Path
if (-not (Has "node")) {
  $done = $false
  if ($HasWinget) {
    try { winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements | Out-Null; Refresh-Path; $done = Has "node" } catch {}
  }
  if (-not $done) {
    $idx = Invoke-RestMethod "https://nodejs.org/dist/index.json"
    $v = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version
    $zip = Join-Path $Bin "node.zip"
    Invoke-WebRequest "https://nodejs.org/dist/$v/node-$v-win-x64.zip" -OutFile $zip
    Expand-Archive -Force $zip -DestinationPath $Bin; Remove-Item $zip
    $nd = Get-ChildItem $Bin -Directory -Filter "node-*" | Select-Object -First 1
    $env:Path = "$($nd.FullName);$env:Path"
    [Environment]::SetEnvironmentVariable("Path", "$($nd.FullName);" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")
  }
}
if (Has "node") { Ok "Node.js $(node --version)" } else { Bad "Node.js не установился" }

# ── ffmpeg ──
if (-not (Has "ffmpeg")) {
  $done = $false
  if ($HasWinget) {
    try { winget install --id Gyan.FFmpeg -e --silent --accept-source-agreements --accept-package-agreements | Out-Null; Refresh-Path; $done = Has "ffmpeg" } catch {}
  }
  if (-not $done) {
    $zip = Join-Path $Bin "ffmpeg.zip"
    Invoke-WebRequest "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $zip
    Expand-Archive -Force $zip -DestinationPath $Bin; Remove-Item $zip
    $fd = (Get-ChildItem $Bin -Directory -Filter "ffmpeg-*" | Select-Object -First 1).FullName + "\bin"
    $env:Path = "$fd;$env:Path"
    [Environment]::SetEnvironmentVariable("Path", "$fd;" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")
  }
}
if (Has "ffmpeg") { Ok "ffmpeg" } else { Bad "ffmpeg не установился" }

# ── Blender ──
if (-not $Blender) {
  $root = Join-Path ${env:ProgramFiles} "Blender Foundation"
  if (Test-Path $root) { $Blender = (Get-ChildItem $root -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName "blender.exe" } | Where-Object { Test-Path $_ } | Select-Object -First 1) }
}
if ($Blender -and (Test-Path $Blender)) { Ok "Blender → $Blender" } else { Bad "Blender не найден — передай путь: -Blender <путь из bpy.app.binary_path>"; exit 1 }

# ── MPFB + MakeHuman ──
& $Blender -b --python (Join-Path $Skill "scripts\blender\install_mpfb.py") 2>&1 | Select-String "✅|❌|MPFB_OK|⬇" | ForEach-Object { Write-Host $_ }

# ── базовые ассеты (снег, кора, доски, гравий, ночное небо) ──
if (Has "node") {
  node (Join-Path $Skill "scripts\fetch_assets.mjs") textures snow_02 pine_bark weathered_planks rocky_gravel
  node (Join-Path $Skill "scripts\fetch_assets.mjs") hdris rogland_moonlit_night
}
Write-Host ""
Write-Host "PATH_ADD=$Bin"
Write-Host "BLENDER_PATH=$Blender"
