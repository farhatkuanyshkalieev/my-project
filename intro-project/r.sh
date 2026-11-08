#!/bin/bash
# usage: r.sh out.mp4 [extra args]
o=$1; shift
npx remotion render src/index.ts Intro "$o" --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --codec=h264 --log=error "$@" 2>&1 | grep -v "^    at" | grep -v -E "^(Rendered|Encoded)" | tail -8
