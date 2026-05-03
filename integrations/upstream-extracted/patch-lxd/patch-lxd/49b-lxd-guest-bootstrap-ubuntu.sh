#!/usr/bin/env bash
set -euo pipefail
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/00-lib.sh"
load_env
require_root
need_cmd python3
need_cmd lxc

guest="${1:-}"
[[ -n "$guest" ]] || die "Usage: lxd-guest-bootstrap-ubuntu <guest>"
meta="$(vm_guest_json "$(vm_guests_file)" "$guest")"
[[ "$meta" != "{}" ]] || die "Guest not found: $guest"
readarray -t vals < <(python3 - "$meta" <<'PY'
import json, sys
m=json.loads(sys.argv[1])
print(m.get('guest_user','ubuntu'))
print('yes' if m.get('enable_lxd') else 'no')
print('yes' if m.get('enable_docker') else 'no')
PY
)
user="${vals[0]}"
enable_lxd="${vals[1]}"
enable_docker="${vals[2]}"

lxc exec "$guest" -- bash -lc 'set -e; export DEBIAN_FRONTEND=noninteractive; apt-get update; apt-get install -y curl ca-certificates gnupg jq git snapd'
if [[ "$enable_docker" == yes ]]; then
  lxc exec "$guest" -- bash -lc 'command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh'
  lxc exec "$guest" -- usermod -aG docker "$user"
fi
if [[ "$enable_lxd" == yes ]]; then
  lxc exec "$guest" -- bash -lc 'snap install lxd --channel=5.21/stable || true'
  lxc exec "$guest" -- usermod -aG lxd "$user"
fi
log "LXD guest bootstrap complete for ${guest}"
