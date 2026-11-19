#!/usr/bin/env bash
# Установка всего нужного на Mac/Linux — у пользователя есть только Blender (+ MCP-мост). Без sudo.
#   bash bootstrap.sh [/путь/к/blender]
# Node.js и ffmpeg: Homebrew, если есть; иначе портативно в ~/.real3d-shorts/bin. Затем MPFB + MakeHuman, ассеты.
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
H="${REAL3D_HOME:-$HOME/.real3d-shorts}"; BIN="$H/bin"; mkdir -p "$BIN"
export PATH="$BIN:$BIN/node/bin:$PATH"
ok(){ echo "✅ $1"; }; bad(){ echo "❌ $1"; }
ARCH=$(uname -m); OS=$(uname -s)

if ! command -v node >/dev/null; then
  if command -v brew >/dev/null; then brew install node || true; fi
  if ! command -v node >/dev/null; then
    V=$(curl -s https://nodejs.org/dist/index.json | grep -o '"version":"v[0-9.]*"[^}]*"lts":"[A-Za-z]' | head -1 | grep -o 'v[0-9.]*')
    case "$OS-$ARCH" in Darwin-arm64) P=darwin-arm64;; Darwin-*) P=darwin-x64;; *-aarch64) P=linux-arm64;; *) P=linux-x64;; esac
    curl -sL "https://nodejs.org/dist/$V/node-$V-$P.tar.gz" | tar xz -C "$BIN" && rm -rf "$BIN/node" && mv "$BIN/node-$V-$P" "$BIN/node"
  fi
fi
command -v node >/dev/null && ok "Node.js $(node --version)" || bad "Node.js не установился"

if ! command -v ffmpeg >/dev/null; then
  if command -v brew >/dev/null; then brew install ffmpeg || true; fi
  if ! command -v ffmpeg >/dev/null; then
    if [ "$OS" = Darwin ]; then
      curl -sL https://evermeet.cx/ffmpeg/getrelease/zip -o "$BIN/ff.zip" && unzip -o -q "$BIN/ff.zip" -d "$BIN" && rm "$BIN/ff.zip"
      curl -sL https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o "$BIN/fp.zip" && unzip -o -q "$BIN/fp.zip" -d "$BIN" && rm "$BIN/fp.zip"
    else
      curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar xJ -C "$BIN" --strip-components=1
    fi
    chmod +x "$BIN"/ff* || true
  fi
fi
command -v ffmpeg >/dev/null && ok "ffmpeg" || bad "ffmpeg не установился"

B="${1:-}"
[ -z "$B" ] && for c in /Applications/Blender.app/Contents/MacOS/Blender "$HOME/Applications/Blender.app/Contents/MacOS/Blender" /usr/bin/blender /snap/bin/blender; do [ -x "$c" ] && B="$c" && break; done
[ -x "$B" ] && ok "Blender → $B" || { bad "Blender не найден — передай путь из bpy.app.binary_path"; exit 1; }

"$B" -b --python "$SKILL/scripts/blender/install_mpfb.py" 2>&1 | grep -E "✅|❌|MPFB_OK|⬇" || true
node "$SKILL/scripts/fetch_assets.mjs" textures snow_02 pine_bark weathered_planks rocky_gravel
node "$SKILL/scripts/fetch_assets.mjs" hdris rogland_moonlit_night
echo; echo "PATH_ADD=$BIN:$BIN/node/bin"; echo "BLENDER_PATH=$B"
