#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

mode="${1:-handshake}"

check_lxd_exec() {
  local inst="$1"
  log "LXD exec handshake: $inst"
  assert_instance_running "$inst"
  lxc exec "$inst" -- bash -lc 'echo "identity=$(hostname) user=$(id -un) uid=$(id -u) time=$(date -Is)"'
}

check_ssh_fido() {
  log "SSH/FIDO local operator check"
  if ssh-add -L >/tmp/niurk-ssh-agent-keys.$$ 2>/dev/null; then
    local count skcount
    count="$(wc -l </tmp/niurk-ssh-agent-keys.$$ | tr -d " ")"
    skcount="$(grep -c 'sk-' /tmp/niurk-ssh-agent-keys.$$ || true)"
    log "ssh-agent keys=$count fido_sk_keys=$skcount"
    if [[ "${FIDO_REQUIRED:-0}" == "1" && "$skcount" == "0" ]]; then
      rm -f /tmp/niurk-ssh-agent-keys.$$
      die "FIDO_REQUIRED=1 but no sk-* key is loaded in ssh-agent"
    fi
  else
    if [[ "${FIDO_REQUIRED:-0}" == "1" ]]; then
      die "FIDO_REQUIRED=1 but ssh-agent has no visible keys"
    fi
    warn "ssh-agent has no visible keys; continuing because FIDO_REQUIRED=0"
  fi
  rm -f /tmp/niurk-ssh-agent-keys.$$ || true
}

check_namespace_claim() {
  log "namespace claim"
  cat <<EOF
namespace=${NIURK_NAMESPACE:-rhiz}
identity_realm=${NIURK_IDENTITY_REALM:-rhiz/niurk}
service_realm=${NIURK_SERVICE_REALM:-rhiz/services}
target_claim=host:${TARGET_NODE}/vm:${TARGET_VM}/container:${AI_CONTAINER}
EOF
}

if [[ "$mode" == "auth" ]]; then
  check_ssh_fido
  check_namespace_claim
  ok "auth namespace check completed"
  exit 0
fi

check_lxd_exec "$SOURCE_VM"
check_lxd_exec "$TARGET_VM"
if [[ "$(instance_state "$AI_CONTAINER" 2>/dev/null || true)" == "RUNNING" ]]; then
  check_lxd_exec "$AI_CONTAINER"
else
  warn "$AI_CONTAINER absent; deploy-ai-container will create it"
fi
check_ssh_fido
check_namespace_claim
ok "handshake completed"
