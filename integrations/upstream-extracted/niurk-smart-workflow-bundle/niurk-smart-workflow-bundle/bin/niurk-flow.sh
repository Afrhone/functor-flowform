#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
# shellcheck source=bin/lib/niurk-lib.sh
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

usage() {
  cat <<EOF
niurk-flow.sh <command>

Commands:
  status              Show cluster/instance status
  discover            Inventory source, target and AI host/container
  check               Smart host/vm/container system check
  handshake           LXD/SSH/FIDO/namespace handshake checks
  auth                Validate operator/auth namespace claims
  render              Render compose/env/systemd files locally
  deploy-ai-container Create/update niurk-ai-rocm on ark-rhiz
  integrate-vm        Write target env and helper scripts into niurk-42
  deploy-services     Bring selected target compose stacks up (guarded)
  validate            Validate endpoints and service health
  cutover-check       Verify cutover gates without stopping source
  cutover             Stop selected source services only with explicit token
  rollback-info       Print rollback instructions
  state               Print current state

Examples:
  ./bin/niurk-flow.sh status
  ./bin/niurk-flow.sh discover
  DRY_RUN=0 ALLOW_DEPLOY=1 ./bin/niurk-flow.sh deploy-ai-container
EOF
}

cmd="${1:-}"
case "$cmd" in
  status)
    "$NIURK_ROOT/bin/system-check.sh" status
    ;;
  discover)
    "$NIURK_ROOT/bin/service-inventory.sh" all
    state_set DISCOVERED
    ;;
  check)
    "$NIURK_ROOT/bin/system-check.sh" full
    ;;
  handshake)
    "$NIURK_ROOT/bin/remote-handshake.sh"
    state_set HANDSHAKEN
    ;;
  auth)
    "$NIURK_ROOT/bin/remote-handshake.sh" auth
    state_set AUTH_VALIDATED
    ;;
  render)
    "$NIURK_ROOT/bin/render-compose.sh"
    state_set SERVICES_RENDERED
    ;;
  deploy-ai-container)
    "$NIURK_ROOT/bin/deploy-ai-container.sh"
    state_set AI_CONTAINER_READY
    ;;
  integrate-vm)
    "$NIURK_ROOT/bin/integrate-vm.sh"
    state_set TARGET_READY
    ;;
  deploy-services)
    "$NIURK_ROOT/bin/integrate-vm.sh" deploy-services
    state_set SERVICES_DEPLOYED
    ;;
  validate)
    "$NIURK_ROOT/bin/validate.sh"
    state_set VALIDATED
    ;;
  cutover-check)
    "$NIURK_ROOT/bin/state-machine.sh" cutover-check
    state_set CUTOVER_READY
    ;;
  cutover)
    "$NIURK_ROOT/bin/state-machine.sh" cutover
    state_set CUTOVER_DONE
    ;;
  rollback-info)
    sed -n '1,260p' "$NIURK_ROOT/docs/ROLLBACK.md"
    ;;
  state)
    cat "$NIURK_STATE_DIR/current.json" 2>/dev/null || echo '{"state":"INIT"}'
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage
    die "unknown command: $cmd"
    ;;
esac
