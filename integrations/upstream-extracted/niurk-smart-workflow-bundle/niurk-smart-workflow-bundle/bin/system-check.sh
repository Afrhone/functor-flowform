#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

mode="${1:-full}"
need lxc

status_cluster() {
  log "LXD cluster list"
  lxc cluster list || die "lxc cluster list failed"
  log "LXD instance list"
  lxc list || die "lxc list failed"
}

check_locations() {
  local src_loc tgt_loc ai_loc
  src_loc="$(instance_location "$SOURCE_VM" || true)"
  tgt_loc="$(instance_location "$TARGET_VM" || true)"
  ai_loc="$(instance_location "$AI_CONTAINER" || true)"

  log "source $SOURCE_VM location=$src_loc expected=$SOURCE_NODE alt=$SOURCE_NODE_ALT_EXPECTED"
  if [[ -n "$src_loc" && "$src_loc" != "$SOURCE_NODE" ]]; then
    warn "$SOURCE_VM is on $src_loc, env says $SOURCE_NODE. Update env if LXD list changed."
  fi

  log "target $TARGET_VM location=$tgt_loc expected=$TARGET_NODE"
  [[ "$tgt_loc" == "$TARGET_NODE" ]] || warn "$TARGET_VM not on expected node $TARGET_NODE"

  if [[ -n "$ai_loc" ]]; then
    log "ai container $AI_CONTAINER location=$ai_loc expected=$AI_HOST_NODE"
    [[ "$ai_loc" == "$AI_HOST_NODE" ]] || warn "$AI_CONTAINER not on expected node $AI_HOST_NODE"
  else
    warn "$AI_CONTAINER does not exist yet"
  fi
}

check_guest_pressure() {
  local inst="$1"
  log "pressure check for $inst"
  if [[ "$(instance_state "$inst")" != "RUNNING" ]]; then
    warn "$inst not running"
    return 0
  fi
  lxc exec "$inst" -- bash -lc '
    echo "== hostname =="; hostname
    echo "== uptime =="; uptime || true
    echo "== memory =="; free -h || true
    echo "== swap =="; swapon --show || true
    echo "== disk =="; df -hT / /srv /rhiz /models 2>/dev/null || df -hT || true
    echo "== failed systemd =="; systemctl --failed --no-pager || true
    echo "== docker ps =="; docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -80 || true
  ' || warn "pressure check failed for $inst"
}

check_host_gpu_hint() {
  log "GPU hint: host-local only"
  cat <<EOF
Constraint:
  A physical GPU can be passed only to an instance on the same host.
  K5000 on a non-ark host cannot accelerate $TARGET_VM on $TARGET_NODE.
  Modern vLLM should use Radeon/ROCm on $AI_HOST_NODE via $AI_CONTAINER.
EOF
}

if [[ "$mode" == "status" ]]; then
  status_cluster
  check_locations
  exit 0
fi

status_cluster
check_locations
check_guest_pressure "$SOURCE_VM"
check_guest_pressure "$TARGET_VM"
if [[ "$(instance_state "$AI_CONTAINER" 2>/dev/null || true)" == "RUNNING" ]]; then
  check_guest_pressure "$AI_CONTAINER"
fi
check_host_gpu_hint
ok "system check completed"
