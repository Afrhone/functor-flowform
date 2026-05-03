#!/usr/bin/env bash
set -euo pipefail

NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
NIURK_ENV_FILE="${NIURK_ENV_FILE:-$NIURK_ROOT/env/niurk-cluster.env}"
NIURK_STATE_DIR="${NIURK_STATE_DIR:-$NIURK_ROOT/state}"
NIURK_LOG_DIR="${NIURK_LOG_DIR:-$NIURK_ROOT/logs}"
mkdir -p "$NIURK_STATE_DIR" "$NIURK_LOG_DIR"

if [[ -f "$NIURK_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$NIURK_ENV_FILE"; set +a
fi

TS="$(date +%Y%m%dT%H%M%S%z)"
LOG_FILE="${LOG_FILE:-$NIURK_LOG_DIR/niurk-$TS.log}"

log() { printf '[%s] %s\n' "$(date -Is)" "$*" | tee -a "$LOG_FILE" >&2; }
die() { log "FATAL: $*"; exit 1; }
warn() { log "WARN: $*"; }
ok() { log "OK: $*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

dry() {
  [[ "${DRY_RUN:-1}" == "1" || "${ALLOW_DEPLOY:-0}" != "1" ]]
}

run() {
  log "+ $*"
  if dry; then
    log "DRY_RUN: skipped"
  else
    "$@"
  fi
}

run_shell() {
  log "+ $*"
  if dry; then
    log "DRY_RUN: skipped"
  else
    bash -lc "$*"
  fi
}

lxc_cmd() {
  if [[ "${LXD_REMOTE:-local}" == "local" ]]; then
    lxc "$@"
  else
    lxc "${LXD_REMOTE}:" "$@"
  fi
}

lxc_instance_cmd() {
  local inst="$1"; shift
  lxc "$inst" "$@"
}

lxcexec() {
  local inst="$1"; shift
  log "+ lxc exec $inst -- $*"
  if dry; then
    log "DRY_RUN: skipped"
  else
    lxc exec "$inst" -- "$@"
  fi
}

lxcexec_capture() {
  local inst="$1"; shift
  lxc exec "$inst" -- "$@"
}

state_set() {
  local state="$1"
  local file="$NIURK_STATE_DIR/current.json"
  cat >"$file" <<EOF
{
  "state": "$state",
  "time": "$(date -Is)",
  "namespace": "${NIURK_NAMESPACE:-rhiz}",
  "source_vm": "${SOURCE_VM:-}",
  "target_vm": "${TARGET_VM:-}",
  "ai_container": "${AI_CONTAINER:-}",
  "dry_run": "${DRY_RUN:-1}",
  "allow_deploy": "${ALLOW_DEPLOY:-0}"
}
EOF
  ok "state=$state ($file)"
}

state_get() {
  if [[ -f "$NIURK_STATE_DIR/current.json" ]]; then
    sed -n 's/.*"state": *"\([^"]*\)".*/\1/p' "$NIURK_STATE_DIR/current.json" | head -1
  else
    echo "INIT"
  fi
}

require_deploy_allowed() {
  [[ "${DRY_RUN:-1}" == "0" ]] || die "real deploy requires DRY_RUN=0"
  [[ "${ALLOW_DEPLOY:-0}" == "1" ]] || die "real deploy requires ALLOW_DEPLOY=1"
}

require_source_stop_allowed() {
  require_deploy_allowed
  [[ "${ALLOW_SOURCE_STOP:-0}" == "1" ]] || die "source stop requires ALLOW_SOURCE_STOP=1"
  [[ "${CUTOVER_TOKEN:-}" == "cutover-${SOURCE_VM:-niurk-21}-to-${TARGET_VM:-niurk-42}" ]] || die "bad/missing CUTOVER_TOKEN"
}

instance_location() {
  local inst="$1"
  lxc list "$inst" -c L --format csv 2>/dev/null | head -1
}

instance_state() {
  local inst="$1"
  lxc list "$inst" -c s --format csv 2>/dev/null | head -1
}

assert_instance_running() {
  local inst="$1"
  local st
  st="$(instance_state "$inst")"
  [[ "$st" == "RUNNING" ]] || die "instance $inst is not RUNNING (state=$st)"
}

write_remote_file() {
  local inst="$1"
  local path="$2"
  local tmp
  tmp="$(mktemp)"
  cat > "$tmp"
  log "+ lxc file push - $inst$path"
  if dry; then
    log "DRY_RUN: would write $inst:$path"
    sed -n '1,80p' "$tmp" >&2 || true
  else
    lxc exec "$inst" -- mkdir -p "$(dirname "$path")"
    lxc file push "$tmp" "$inst$path"
  fi
  rm -f "$tmp"
}
