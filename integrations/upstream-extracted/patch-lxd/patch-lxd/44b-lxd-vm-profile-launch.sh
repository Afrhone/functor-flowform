#!/usr/bin/env bash
set -euo pipefail
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/00-lib.sh"
load_env
require_root
need_cmd python3
need_cmd lxc

vm="${1:-}"
profile_name="${2:-}"
forced_host="${3:-}"
[[ -n "$vm" && -n "$profile_name" ]] || die "Usage: lxd-vm-profile-launch <vm-name> <profile-name> [host]"

profile_json="$(vm_profile_json "$(vm_profiles_file)" "$profile_name")"
[[ "$profile_json" != "{}" ]] || die "Profile not found: $profile_name"
guest_json="$(vm_guest_json "$(vm_guests_file)" "$vm")"

readarray -t vals < <(python3 - "$profile_json" "$guest_json" "$forced_host" <<'PY'
import json, sys
p=json.loads(sys.argv[1])
g=json.loads(sys.argv[2]) if sys.argv[2] != '{}' else {}
forced=sys.argv[3]
print(p.get('vcpus',4))
print(p.get('ram_mb',8192))
print(p.get('disk_size','60GiB').replace('G','GiB') if p.get('disk_size') else '60GiB')
print(forced or g.get('host') or '')
print(g.get('bridge') or '')
print('yes' if p.get('enable_lxd') or g.get('enable_lxd') else 'no')
print('yes' if p.get('enable_docker') or g.get('enable_docker') else 'no')
print(p.get('target_pool','cpu'))
print(g.get('guest_user','ubuntu'))
print(p.get('image','ubuntu:24.04'))
print(g.get('lan_addr',''))
PY
)

vcpus="${vals[0]}"
ram_mb="${vals[1]}"
disk_size="${vals[2]}"
target_host="${vals[3]}"
bridge="${vals[4]:-${VM_NETWORK_BRIDGE:-br0}}"
enable_lxd="${vals[5]}"
enable_docker="${vals[6]}"
target_pool="${vals[7]}"
guest_user="${vals[8]}"
image="${vals[9]:-${LXD_UBUNTU_VM_IMAGE:-ubuntu:24.04}}"
lan_addr="${vals[10]}"

[[ -n "$target_host" ]] || die "No target host resolved for $vm (pass [host] or set it in directives/vm-guests.yaml)"

storage_pool="${LXD_VM_STORAGE_POOL:-}"
if [[ -z "$storage_pool" ]]; then
  if [[ "$target_pool" == "gpu" ]]; then
    storage_pool="${LXD_GPU_POOL_STORAGE:-}"
  else
    storage_pool="${LXD_CPU_POOL_STORAGE:-}"
  fi
fi
[[ -n "$storage_pool" ]] || storage_pool="${CEPH_POOL:-rhiz-storage}"
if ! lxc storage show "$storage_pool" >/dev/null 2>&1; then
  if lxc storage show rhiz-storage >/dev/null 2>&1; then
    storage_pool="rhiz-storage"
  elif lxc storage show ceph-rbd >/dev/null 2>&1; then
    storage_pool="ceph-rbd"
  fi
fi

if lxc info "$vm" >/dev/null 2>&1; then
  die "Instance already exists in LXD: $vm"
fi

cloud_cfg="$(mktemp)"
trap 'rm -f "$cloud_cfg"' EXIT
cat > "$cloud_cfg" <<CLOUD
#cloud-config
package_update: true
packages:
  - curl
  - ca-certificates
  - gnupg
  - jq
  - git
runcmd:
  - [ bash, -lc, "id ${guest_user} >/dev/null 2>&1 || useradd -m -s /bin/bash ${guest_user}" ]
  - [ bash, -lc, "usermod -aG sudo ${guest_user} || true" ]
  - [ bash, -lc, "echo '${guest_user} ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/90-${guest_user}" ]
  - [ chmod, '0440', /etc/sudoers.d/90-${guest_user} ]
CLOUD
if [[ "$enable_docker" == yes ]]; then
cat >> "$cloud_cfg" <<'CLOUD'
  - [ bash, -lc, "command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh" ]
CLOUD
fi
if [[ "$enable_lxd" == yes ]]; then
cat >> "$cloud_cfg" <<'CLOUD'
  - [ bash, -lc, "command -v lxd >/dev/null 2>&1 || snap install lxd --channel=5.21/stable || true" ]
CLOUD
fi

log "Launching LXD VM ${vm} on ${target_host} (pool=${storage_pool}, bridge=${bridge}, image=${image})"
lxc init "$image" "$vm" --vm --target "$target_host" --storage "$storage_pool" \
  -c limits.cpu="$vcpus" \
  -c limits.memory="${ram_mb}MiB" \
  -c agent.nic_config=true \
  -d root,size="$disk_size"

# Disable default profile NIC if present, then add a direct bridged NIC.
lxc config device override "$vm" eth0 type=none >/dev/null 2>&1 || true
if ! lxc config device show "$vm" | grep -q '^lan0:'; then
  lxc config device add "$vm" lan0 nic nictype=bridged parent="$bridge" name=lan0
fi

# Attach cloud-init seed generated from the modern cloud-init namespace.
lxc config set "$vm" cloud-init.user-data=- < "$cloud_cfg"

# Optional static IPv4 hint for images that honor cloud-init network config.
if [[ -n "$lan_addr" ]]; then
  gw="${VM_LAN_GATEWAY:-192.168.0.1}"
  cat <<NETCFG | lxc config set "$vm" cloud-init.network-config=-
version: 2
ethernets:
  lan0:
    dhcp4: false
    dhcp6: true
    addresses:
      - ${lan_addr}/24
    routes:
      - to: default
        via: ${gw}
    nameservers:
      addresses: [${VM_DNS_1:-192.168.0.1}, ${VM_DNS_2:-1.1.1.1}]
NETCFG
fi

lxc start "$vm"

if python3 - "$profile_json" <<'PY' >/dev/null 2>&1
import json, sys
p=json.loads(sys.argv[1])
raise SystemExit(0 if p.get('gpu_attach') else 1)
PY
then
  lxc config device add "$vm" gpu0 gpu gputype=physical >/dev/null 2>&1 || warn "GPU attach skipped; add a specific GPU manually if needed"
fi

log "VM ${vm} launched on ${target_host}. Useful follow-ups:"
cat <<EOT
  lxc info ${vm}
  lxc console ${vm} --type=vga
  lxc config show ${vm} --expanded
EOT
