#!/usr/bin/env bash
set -euo pipefail
echo "== libvirt networks =="; virsh net-list --all || true
echo "== bridges =="; ip -br link show type bridge || true
echo "== routes =="; ip route || true
echo "== nft/firewalld evidence =="; firewall-cmd --get-active-zones 2>/dev/null || true
