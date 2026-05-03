#!/usr/bin/env bash
set -euo pipefail
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/00-lib.sh"
load_env
require_root
need_cmd python3
need_cmd lxc

name="${1:-}"
profile_name="${2:-}"
forced_host="${3:-}"
[[ -n "$name" && -n "$profile_name" ]] || die "Usage: lxd-container-profile-launch <name> <profile-name> [host]"
profile_json="$(vm_profile_json "$(vm_profiles_file)" "$profile_name")"
[[ "$profile_json" != "{}" ]] || die "Profile not found: $profile_name"

readarray -t vals < <(python3 - "$profile_json" "$forced_host" <<'PY'
import json, sys
p=json.loads(sys.argv[1])
forced=sys.argv[2]
print(p.get('vcpus',4))
print(p.get('ram_mb',8192))
print(forced)
print(p.get('target_pool','cpu'))
print('yes' if p.get('enable_docker') else 'no')
print(p.get('image','ubuntu:24.04'))
PY
)

vcpus="${vals[0]}"
ram_mb="${vals[1]}"
target_host="${vals[2]}"
target_pool="${vals[3]}"
enable_docker="${vals[4]}"
image="${vals[5]:-${LXD_UBUNTU_CONTAINER_IMAGE:-ubuntu:24.04}}"
[[ -n "$target_host" ]] || die "Pass a target host for container placement"

storage_pool="${LXD_CONTAINER_STORAGE_POOL:-}"
if [[ -z "$storage_pool" ]]; then
  if [[ "$target_pool" == "gpu" ]]; then storage_pool="${LXD_GPU_POOL_STORAGE:-}"; else storage_pool="${LXD_CPU_POOL_STORAGE:-}"; fi
fi
[[ -n "$storage_pool" ]] || storage_pool="${CEPH_POOL:-rhiz-storage}"
if ! lxc storage show "$storage_pool" >/dev/null 2>&1; then
  if lxc storage show rhiz-storage >/dev/null 2>&1; then storage_pool="rhiz-storage"; fi
fi

lxc init "$image" "$name" --target "$target_host" --storage "$storage_pool" \
  -c limits.cpu="$vcpus" \
  -c limits.memory="${ram_mb}MiB" \
  -c security.nesting=true

if [[ "$enable_docker" == yes ]]; then
  cat <<'EOF2' | lxc config set "$name" cloud-init.user-data=-
#cloud-config
package_update: true
runcmd:
  - [ bash, -lc, "command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh" ]
EOF2
fi

if python3 - "$profile_json" <<'PY' >/dev/null 2>&1
import json, sys
p=json.loads(sys.argv[1])
raise SystemExit(0 if p.get('gpu_attach') else 1)
PY
then
  lxc config device add "$name" gpu0 gpu gputype=physical id=nvidia.com/gpu=0 >/dev/null 2>&1 || \
  lxc config device add "$name" gpu0 gpu gputype=physical >/dev/null 2>&1 || \
  warn "GPU attach skipped; add the device manually if needed"
fi

lxc start "$name"
log "Container ${name} launched on ${target_host}"
