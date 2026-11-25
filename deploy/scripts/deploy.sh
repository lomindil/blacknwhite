#!/usr/bin/env bash
# Pull the images for TAG (default: latest) and restart whatever changed. Runs on the server:
#   TAG=v0.1.0 /srv/redreader/scripts/deploy.sh
# Migrations run automatically (the "migrate" service) before the API starts.
set -euo pipefail
cd /srv/redreader
if [ -n "${TAG:-}" ]; then sed -i "s|^TAG=.*|TAG=$TAG|" .env; fi
docker compose pull --quiet
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
echo "Waiting for the API to report healthy…"
for i in $(seq 1 30); do
  if docker compose exec -T api node -e "fetch('http://localhost:4000/health').then(r=>r.json()).then(j=>process.exit(j.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "Deployed $(grep ^TAG= .env | cut -d= -f2) — healthy."
    exit 0
  fi
  sleep 4
done
echo "API did not become healthy. Recent logs:" >&2
docker compose logs --tail 60 api migrate >&2
exit 1
