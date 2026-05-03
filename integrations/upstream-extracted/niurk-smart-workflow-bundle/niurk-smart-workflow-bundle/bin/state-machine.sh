#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

cmd="${1:-show}"

case "$cmd" in
  show)
    sed -n '1,240p' "$NIURK_ROOT/config/state-machine.yaml"
    ;;
  cutover-check)
    cur="$(state_get)"
    log "current state=$cur"
    [[ "$cur" == "VALIDATED" || "$cur" == "CUTOVER_READY" ]] || die "cutover requires state VALIDATED; run validate first"
    require_source_stop_allowed
    ok "cutover gates pass; source stop is now permitted by env and token"
    ;;
  cutover)
    cur="$(state_get)"
    [[ "$cur" == "VALIDATED" || "$cur" == "CUTOVER_READY" ]] || die "cutover requires state VALIDATED/CUTOVER_READY"
    require_source_stop_allowed
    log "source stop is enabled, but this script does not guess which services to stop"
    cat <<EOF
Create $SOURCE_VM:/opt/niurk-directives/selected-source-stop.sh with explicit stop commands, for example:

  docker stop kobalt-edge-router rhiz-nginx-edge-https
  docker compose -f /path/to/compose.yaml down

Then run:

  lxc exec $SOURCE_VM -- bash /opt/niurk-directives/selected-source-stop.sh

This prevents blind shutdown of databases or unrelated services.
EOF
    ;;
  *)
    die "usage: $0 [show|cutover-check|cutover]"
    ;;
esac
