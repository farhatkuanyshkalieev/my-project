#!/bin/bash
# Final EEVEE render with resume (render2.py skips finished PNGs). usage: render_nv.sh <res> <outdir> [range a-b]
B=/opt/blender/blender-5.2.4-linux-x64/blender
SK=/root/.claude/skills/voxel-reel/scripts/lib
P=/home/user/my-project/reels/nvidia
RES=$1; OUT=$2; RG=$3
mkdir -p "$OUT"
for try in 1 2 3 4 5 6 7 8; do
  if [ -n "$RG" ]; then
    "$B" -b "$P/render/nv_scene.blend" --python "$SK/render2.py" -- res=$RES out="$OUT" range=$RG > "$OUT/log_${RG}_$try.txt" 2>&1
  else
    "$B" -b "$P/render/nv_scene.blend" --python "$SK/render2.py" -- res=$RES out="$OUT" > "$OUT/log_all_$try.txt" 2>&1
  fi
  grep -q "RENDER2 DONE" "$OUT"/log_*_$try.txt && break
done
echo "RENDER FINISHED $RG"
