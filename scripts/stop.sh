#!/usr/bin/env bash
# Stops everything this project started, cleanly:
#   web and API (and their child processes) → Docker services.
#
# Usage: scripts/stop.sh [--keep-services] [--down] [--purge]
#   --keep-services  stop only the app processes; leave Postgres/Redis/etc. running
#   --down           remove the service containers too (data volumes are kept)
#   --purge          remove containers AND data volumes — deletes the local database (asks first)
#
# Also catches app processes started outside start.sh (e.g. `pnpm dev`) by looking for
# Node processes running inside this project folder.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN="$ROOT/.run"
SERVICES=stop

for arg in "$@"; do
  case "$arg" in
    --keep-services) SERVICES=keep ;;
    --down) SERVICES=down ;;
    --purge) SERVICES=purge ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
note() { printf '  · %s\n' "$*"; }

# Ends a whole process group: TERM, wait up to 10s, then KILL.
stop_group() { # pgid label
  local pgid=$1 label=$2
  kill -0 -- "-$pgid" 2>/dev/null || return 1
  kill -TERM -- "-$pgid" 2>/dev/null
  for _ in $(seq 1 20); do
    kill -0 -- "-$pgid" 2>/dev/null || { ok "Stopped $label"; return 0; }
    sleep 0.5
  done
  kill -KILL -- "-$pgid" 2>/dev/null
  ok "Stopped $label (forced after 10s)"
}

bold "Stopping the app"
stopped_any=0

# 1. Processes started by start.sh (pid files).
for name in web api; do
  file="$RUN/$name.pid"
  [[ -f "$file" ]] || continue
  pid=$(cat "$file")
  if stop_group "$pid" "$name (pid $pid)"; then stopped_any=1; fi
  rm -f "$file"
done

# 2. Anything else from this project: Node processes whose working directory is inside it.
#    Never touch this shell or its parents.
protected=" $$ $PPID "
p=$PPID
while [[ $p -gt 1 ]]; do p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' '); [[ -z $p ]] && break; protected+="$p "; done

declare -A groups=()
for proc in /proc/[0-9]*; do
  pid=${proc#/proc/}
  [[ $protected == *" $pid "* ]] && continue
  cwd=$(readlink "$proc/cwd" 2>/dev/null) || continue
  [[ $cwd == "$ROOT" || $cwd == "$ROOT"/* ]] || continue
  comm=$(cat "$proc/comm" 2>/dev/null)
  [[ $comm =~ ^(node|npm|npx|pnpm|next-server|next-router-wo|turbo|node-MainThread)$ || $comm == next* ]] || continue
  pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
  [[ -n $pgid && $protected != *" $pgid "* ]] && groups[$pgid]+="$pid "
done
for pgid in "${!groups[@]}"; do
  desc=$(ps -o args= -p "${groups[$pgid]%% *}" 2>/dev/null | cut -c1-50)
  if stop_group "$pgid" "${desc:-process group $pgid}"; then
    stopped_any=1
  else
    # Not a group leader we can signal as a group; stop the individual processes.
    kill -TERM ${groups[$pgid]} 2>/dev/null && ok "Stopped ${desc:-pids ${groups[$pgid]}}" && stopped_any=1
  fi
done
[[ $stopped_any == 0 ]] && note "No app processes were running"

for port in 3000 4000; do
  pid=$(ss -ltnpH "( sport = :$port )" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
  [[ -n $pid ]] && note "Port $port is still used by pid $pid ($(ps -o args= -p "$pid" | cut -c1-50)) — not from this project, left alone"
done

# 3. Docker services.
cd "$ROOT"
case $SERVICES in
  keep)
    note "Leaving Docker services running" ;;
  stop)
    bold "Stopping Docker services"
    docker compose stop >/dev/null 2>&1 && ok "Postgres, Redis, Meilisearch, Mailpit stopped (data kept; start.sh brings them back)" ;;
  down)
    bold "Removing Docker service containers"
    docker compose down >/dev/null 2>&1 && ok "Containers removed (database volume kept)" ;;
  purge)
    read -r -p "This deletes the local database and search index. Type 'purge' to confirm: " answer
    if [[ $answer == purge ]]; then
      docker compose down -v >/dev/null 2>&1 && ok "Containers and data volumes removed"
    else
      note "Cancelled; stopping services instead"
      docker compose stop >/dev/null 2>&1 && ok "Docker services stopped"
    fi ;;
esac

echo
bold "Done."
