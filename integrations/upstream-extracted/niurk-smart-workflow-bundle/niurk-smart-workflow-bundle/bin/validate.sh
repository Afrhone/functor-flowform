#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

assert_instance_running "$SOURCE_VM"
assert_instance_running "$TARGET_VM"

log "validate source still running"
lxc list "$SOURCE_VM" -c ns4tL

log "validate target"
lxc exec "$TARGET_VM" -- bash -lc '
  set -euo pipefail
  /opt/niurk-directives/healthcheck.sh || true
  test -f /opt/niurk-directives/ai-endpoints.env
  . /opt/niurk-directives/ai-endpoints.env
  echo "VLLM_BASE_URL=$VLLM_BASE_URL"
  echo "DMR_BASE_URL=$DMR_BASE_URL"
'

if [[ "$(instance_state "$AI_CONTAINER" 2>/dev/null || true)" == "RUNNING" ]]; then
  log "validate AI container local endpoints"
  lxc exec "$AI_CONTAINER" -- bash -lc '
    set -euo pipefail
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" || true
    curl -fsS http://127.0.0.1:'"$VLLM_PORT"'/v1/models || true
    curl -fsS http://127.0.0.1:'"$DMR_PORT"'/engines/v1/models || true
  ' || warn "AI endpoint validation returned warnings"
else
  warn "$AI_CONTAINER not running; AI validation skipped"
fi

log "validate target-to-AI route"
lxc exec "$TARGET_VM" -- bash -lc '
  set -euo pipefail
  . /opt/niurk-directives/ai-endpoints.env
  curl -fsS --max-time 5 "$VLLM_BASE_URL/models" || echo "WARN: vLLM route not ready"
  curl -fsS --max-time 5 "$DMR_BASE_URL/engines/v1/models" || echo "WARN: DMR route not ready"
'

ok "validation completed; review warnings before cutover"
