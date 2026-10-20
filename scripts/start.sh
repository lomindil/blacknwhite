#!/usr/bin/env bash
# Starts everything this project needs, in order:
#   Docker services → env files → dependencies → database migrations → API (+ worker) → web.
#
# Usage: scripts/start.sh [--prod] [--seed] [--no-web]
#   --prod    run production builds (less memory than watch mode; rebuilds first)
#   --seed    reset the database with sample data after migrating
#   --no-web  start only the services and the API
#
# Stop everything with scripts/stop.sh. Logs and pid files live in .run/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN="$ROOT/.run"
API_PORT=4000
WEB_PORT=3000
MODE=dev
SEED=0
WEB=1

for arg in "$@"; do
  case "$arg" in
    --prod) MODE=prod ;;
    --seed) SEED=1 ;;
    --no-web) WEB=0 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

mkdir -p "$RUN"
cd "$ROOT"

# ---------- Preflight ----------
bold "Checking prerequisites"
command -v node >/dev/null || fail "Node.js is not installed"
command -v pnpm >/dev/null || fail "pnpm is not installed (npm i -g pnpm@9)"
command -v docker >/dev/null || fail "Docker is not installed"
docker info >/dev/null 2>&1 || fail "Docker isn't reachable. Is Docker running, and is your user in the docker group?"

port_owner() { ss -ltnpH "( sport = :$1 )" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true; }
for port in "$API_PORT" "$WEB_PORT"; do
  [[ "$port" == "$WEB_PORT" && $WEB == 0 ]] && continue
  pid="$(port_owner "$port")"
  if [[ -n "$pid" ]]; then
    fail "Port $port is in use by pid $pid ($(ps -o args= -p "$pid" | cut -c1-60)) in $(readlink "/proc/$pid/cwd" 2>/dev/null || echo '?'). Run scripts/stop.sh, or stop that process."
  fi
done
avail_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
if (( avail_mb < 1500 )); then
  printf '  \033[33m!\033[0m Only %s MB of memory available. Consider ~/devtools/memcheck.sh to find what to stop.\n' "$avail_mb"
fi
ok "Node $(node -v), pnpm $(pnpm -v), Docker reachable, ${avail_mb} MB free"

# ---------- Services ----------
bold "Starting Docker services (Postgres, Redis, Meilisearch, Mailpit)"
docker compose up -d --wait >/dev/null 2>&1 || {
  docker compose up -d --wait
  fail "Docker services failed to start (see above). A port conflict? Check: docker ps"
}
ok "Postgres :5433 · Redis :6380 · Meilisearch :7700 · Mailpit :8025"

# ---------- Config and dependencies ----------
bold "Preparing the app"
[[ -f apps/api/.env ]] || { cp apps/api/.env.example apps/api/.env; ok "Created apps/api/.env from the example"; }
[[ -f apps/web/.env.local ]] || { cp apps/web/.env.example apps/web/.env.local; ok "Created apps/web/.env.local from the example"; }
if [[ ! -d node_modules || pnpm-lock.yaml -nt node_modules/.modules.yaml ]]; then
  pnpm install --frozen-lockfile --child-concurrency 2 >"$RUN/install.log" 2>&1 || fail "pnpm install failed — see .run/install.log"
  ok "Dependencies installed"
fi
pnpm --filter @bnw/shared build >/dev/null || fail "Building packages/shared failed"
ok "Shared package built"

(cd apps/api && npx prisma migrate deploy >"$RUN/migrate.log" 2>&1) || fail "Database migration failed — see .run/migrate.log"
ok "Database migrated"

if [[ $SEED == 1 ]]; then
  pnpm --filter @bnw/api seed >"$RUN/seed.log" 2>&1 || fail "Seeding failed — see .run/seed.log"
  ok "Sample data loaded (dev sign-in: meera@example.com, admin@example.com, …)"
fi

if [[ $MODE == prod ]]; then
  bold "Building for production"
  pnpm --filter @bnw/api build >"$RUN/build-api.log" 2>&1 || fail "API build failed — see .run/build-api.log"
  ok "API built"
  if [[ $WEB == 1 ]]; then
    (cd apps/web && NEXT_TELEMETRY_DISABLED=1 npx next build >"$RUN/build-web.log" 2>&1) || fail "Web build failed — see .run/build-web.log"
    ok "Web built"
  fi
fi

# ---------- App processes ----------
# Each process gets its own process group (setsid) so stop.sh can end it and all its children.
launch() { # name dir command...
  local name=$1 dir=$2; shift 2
  # The subshell's own output goes to the log (so it never holds this script's stdout open),
  # and `exec setsid` turns it into the leader of a new process group: $! is that group's id.
  (cd "$dir" && exec setsid "$@") >"$RUN/$name.log" 2>&1 </dev/null &
  echo $! >"$RUN/$name.pid"
}

wait_for() { # name url seconds
  local name=$1 url=$2 secs=$3
  for ((i = 0; i < secs; i++)); do
    if curl -sf -o /dev/null "$url"; then return 0; fi
    if ! kill -0 "$(cat "$RUN/$name.pid")" 2>/dev/null; then
      tail -20 "$RUN/$name.log" >&2
      fail "$name exited during startup — see .run/$name.log"
    fi
    sleep 1
  done
  tail -20 "$RUN/$name.log" >&2
  fail "$name didn't become ready in ${secs}s — see .run/$name.log"
}

bold "Starting the app ($MODE mode)"
if [[ $MODE == prod ]]; then
  launch api "$ROOT/apps/api" node dist/main.js
else
  launch api "$ROOT/apps/api" npx nest start --watch --preserveWatchOutput
fi
wait_for api "http://localhost:$API_PORT/health" 120
ok "API     http://localhost:$API_PORT  (background worker runs inside it)"

if [[ $WEB == 1 ]]; then
  if [[ $MODE == prod ]]; then
    launch web "$ROOT/apps/web" env NEXT_TELEMETRY_DISABLED=1 npx next start -p "$WEB_PORT"
  else
    launch web "$ROOT/apps/web" env NEXT_TELEMETRY_DISABLED=1 npx next dev -p "$WEB_PORT"
  fi
  wait_for web "http://localhost:$WEB_PORT/terms" 180
  ok "Web     http://localhost:$WEB_PORT"
fi

echo
bold "Ready."
echo "  Open http://localhost:$WEB_PORT · emails at http://localhost:8025 · logs in .run/*.log"
echo "  Stop everything with: scripts/stop.sh"
