#!/usr/bin/env bash
set -euo pipefail

# Logical-dynamical deployment heuristics.
# This script scores readiness from observable signals. It is intentionally simple,
# transparent and safe to run in shells without Python dependencies.

score=100
declare -a reasons=()

penalty() {
  local points="$1"; shift
  score=$((score - points))
  reasons+=("-$points $*")
}

check_value() {
  local name="$1" value="$2" op="$3" limit="$4" penalty_points="$5"
  case "$op" in
    gt) awk "BEGIN{exit !($value > $limit)}" && penalty "$penalty_points" "$name=$value > $limit" || true ;;
    lt) awk "BEGIN{exit !($value < $limit)}" && penalty "$penalty_points" "$name=$value < $limit" || true ;;
  esac
}

# Inputs may be exported by callers.
check_value "swap_used_pct" "${SWAP_USED_PCT:-0}" gt "${MAX_SWAP_USED_PCT:-50}" 25
check_value "iowait_pct" "${IOWAIT_PCT:-0}" gt "${MAX_IOWAIT_PCT:-30}" 25
check_value "load_per_cpu" "${LOAD_PER_CPU:-0}" gt "${MAX_LOAD_PER_CPU:-2.5}" 15
check_value "free_gib" "${FREE_GIB:-999}" lt "${MIN_TARGET_FREE_GIB:-4}" 15

if [[ "${SOURCE_RUNNING:-1}" != "1" ]]; then penalty 40 "source VM not running"; fi
if [[ "${TARGET_RUNNING:-1}" != "1" ]]; then penalty 40 "target VM not running"; fi
if [[ "${ENDPOINT_OK:-0}" != "1" ]]; then penalty 20 "AI endpoint not validated"; fi
if [[ "${IDENTITY_OK:-0}" != "1" ]]; then penalty 20 "identity/namespace not validated"; fi

[[ "$score" -lt 0 ]] && score=0

echo "readiness_score=$score"
printf '%s\n' "${reasons[@]:-no penalties}"
if [[ "$score" -lt 70 ]]; then
  exit 2
fi
