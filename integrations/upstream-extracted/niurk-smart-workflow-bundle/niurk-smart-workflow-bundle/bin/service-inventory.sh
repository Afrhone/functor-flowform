#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

target="${1:-all}"
out="$NIURK_STATE_DIR/inventory-$TS"
mkdir -p "$out"

inventory_instance() {
  local inst="$1"
  log "inventory $inst -> $out/$inst"
  mkdir -p "$out/$inst"
  if [[ "$(instance_state "$inst")" != "RUNNING" ]]; then
    warn "$inst is not running"
    return 0
  fi

  lxc exec "$inst" -- bash -lc '
    set -euo pipefail
    mkdir -p /tmp/niurk-inventory
    hostnamectl > /tmp/niurk-inventory/hostnamectl.txt 2>&1 || true
    ip -br a > /tmp/niurk-inventory/ip-brief.txt 2>&1 || true
    ss -lntup > /tmp/niurk-inventory/ports.txt 2>&1 || true
    systemctl list-units --type=service --state=running --no-pager > /tmp/niurk-inventory/systemd-running.txt 2>&1 || true
    systemctl list-unit-files --type=service --state=enabled --no-pager > /tmp/niurk-inventory/systemd-enabled.txt 2>&1 || true
    docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" > /tmp/niurk-inventory/docker-ps.txt 2>&1 || true
    docker compose ls > /tmp/niurk-inventory/docker-compose-ls.txt 2>&1 || true
    find '"$PROJECT_ROOTS"' -maxdepth 6 \( -name compose.yaml -o -name compose.yml -o -name docker-compose.yml -o -name docker-compose.yaml \) -print > /tmp/niurk-inventory/compose-files.txt 2>/dev/null || true
    free -h > /tmp/niurk-inventory/free.txt 2>&1 || true
    df -hT > /tmp/niurk-inventory/df.txt 2>&1 || true
    ps -eo pid,user,pcpu,pmem,stat,lstart,args --sort=-%mem | head -120 > /tmp/niurk-inventory/ps-topmem.txt 2>&1 || true
    tar -C /tmp -czf /tmp/niurk-inventory.tgz niurk-inventory
  ' || warn "remote inventory command failed for $inst"

  lxc file pull "$inst/tmp/niurk-inventory.tgz" "$out/$inst.tgz" || warn "could not pull inventory tar for $inst"
}

case "$target" in
  source) inventory_instance "$SOURCE_VM" ;;
  target) inventory_instance "$TARGET_VM" ;;
  ai) inventory_instance "$AI_CONTAINER" ;;
  all)
    inventory_instance "$SOURCE_VM"
    inventory_instance "$TARGET_VM"
    if [[ "$(instance_state "$AI_CONTAINER" 2>/dev/null || true)" == "RUNNING" ]]; then
      inventory_instance "$AI_CONTAINER"
    fi
    ;;
  *) die "usage: $0 [source|target|ai|all]" ;;
esac

ok "inventory path: $out"
