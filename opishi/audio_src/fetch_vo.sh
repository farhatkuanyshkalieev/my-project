#!/usr/bin/env bash
# Downloads the generated voice lines listed in vo_manifest.tsv
cd "$(dirname "$0")"
mkdir -p vo
while IFS=$'\t' read -r id url; do
  [ -s "vo/$id.mp3" ] || curl -sS -f -o "vo/$id.mp3" "$url" && echo "ok $id"
done < vo_manifest.tsv
