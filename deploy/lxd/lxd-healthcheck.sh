#!/usr/bin/env bash
set -euo pipefail
echo "== LXD version =="; lxc version || true
echo "== Cluster =="; lxc cluster list || true
echo "== Networks =="; lxc network list || true
echo "== Flowforms profile =="; lxc profile show flowforms 2>/dev/null || echo "profile flowforms not installed"
echo "== Listening ports =="; ss -lntup 2>/dev/null | grep -E ':(80|443|8080|8081|8443|8444)\b' || true
