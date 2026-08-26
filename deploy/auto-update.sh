#!/usr/bin/env bash
set -euo pipefail

repo=/opt/caebon-2.10
exec 9>/tmp/caebon-analysis-auto-update.lock
flock -n 9 || exit 0

cd "$repo"
git fetch origin main
git reset --hard origin/main

test -s "$repo/dist/index.html"
docker rm -f caebon-analysis-web 2>/dev/null || true
docker run -d \
  --name caebon-analysis-web \
  --restart unless-stopped \
  -p 127.0.0.1:3101:80 \
  -v "$repo/dist:/usr/share/nginx/html:ro" \
  nginx:alpine

echo "$(date -Is) deployed: $(git rev-parse HEAD)"
