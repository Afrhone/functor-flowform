# Bundle adaptation: libvirt -> LXD cluster VMs and containers

This overlay keeps the existing bundle structure but replaces the libvirt launch flow with direct LXD cluster launches.

## New helpers

- `modules/44b-lxd-vm-profile-launch.sh`
- `modules/59-lxd-container-profile-launch.sh`
- `modules/49b-lxd-guest-bootstrap-ubuntu.sh`

## exosys.sh additions

Add these usage lines under `LXD / LXC:`:

```text
  sudo ./bin/exosys.sh lxd-vm-profile-launch <name> <profile> [host]
  sudo ./bin/exosys.sh lxd-container-profile-launch <name> <profile> [host]
  sudo ./bin/exosys.sh lxd-guest-bootstrap-ubuntu <guest>
```

Add these case arms:

```bash
  lxd-vm-profile-launch) require_root; "${REPO_ROOT}/modules/44b-lxd-vm-profile-launch.sh" "${2:-}" "${3:-}" "${4:-}" ;;
  lxd-container-profile-launch) require_root; "${REPO_ROOT}/modules/59-lxd-container-profile-launch.sh" "${2:-}" "${3:-}" "${4:-}" ;;
  lxd-guest-bootstrap-ubuntu) require_root; "${REPO_ROOT}/modules/49b-lxd-guest-bootstrap-ubuntu.sh" "${2:-}" ;;
```

## Environment updates

Set these in `.env`:

```bash
LXD_VM_STORAGE_POOL=rhiz-storage
LXD_CONTAINER_STORAGE_POOL=rhiz-storage
LXD_UBUNTU_VM_IMAGE=ubuntu:24.04
LXD_UBUNTU_CONTAINER_IMAGE=ubuntu:24.04
VM_LAN_GATEWAY=192.168.0.1
VM_DNS_1=192.168.0.1
VM_DNS_2=1.1.1.1
```

If your live cluster still uses `ceph-rbd` instead of `rhiz-storage`, point the two storage variables to `ceph-rbd` instead.

## Directive cleanup

### `directives/lxd-cluster.yaml`

Update storage pool names to your live cluster reality. For the current setup discussed in chat, use:

```yaml
storage_pools:
  rhiz-storage:
    driver: ceph
    source: lxd-rbd-ark
  cephfs-shared:
    driver: cephfs
    source: cephfs_shared
```

### `directives/vm-guests.yaml`

Stop using libvirt pool names such as `vms` as if they were LXD storage pools. Keep only host, profile, bridge, and guest bootstrap metadata.

## Command replacements

Old:

```bash
sudo ./bin/exosys.sh vm-profile-launch niurk-42 gpu-fedora sigmo-rhiz
sudo ./bin/exosys.sh guest-bootstrap-ubuntu niurk-24
sudo ./bin/exosys.sh vm-profile-launch niurk-40 hypergraph-gpu ark-rhiz
sudo ./bin/exosys.sh vm-profile-launch niurk-40-lab llm-lab-inference ark-rhiz
```

New:

```bash
sudo ./bin/exosys.sh lxd-vm-profile-launch niurk-42 gpu-fedora sigmo-rhiz
sudo ./bin/exosys.sh lxd-vm-profile-launch niurk-24 gpu-fedora sigmo-rhiz
sudo ./bin/exosys.sh lxd-guest-bootstrap-ubuntu niurk-24
sudo ./bin/exosys.sh lxd-vm-profile-launch niurk-40 hypergraph-gpu ark-rhiz
sudo ./bin/exosys.sh lxd-vm-profile-launch niurk-40-lab llm-lab-inference ark-rhiz
```

For a containerized GPU backend instead of a VM:

```bash
sudo ./bin/exosys.sh lxd-container-profile-launch llama-gpu llama-gpu-compute ark-rhiz
```

## Notes

- The new VM launcher uses LXD official Ubuntu images and cloud-init instead of `virt-install`, `virsh`, and libvirt storage secrets.
- The new guest bootstrap helper uses `lxc exec`, so it works only after the guest image has a working LXD agent. Official Ubuntu LXD images do.
- GPU passthrough is added as an LXD `gpu` device when the profile contains `gpu_attach`.
