#!/usr/bin/env bash
set -euo pipefail
run(){ if [[ "${APPLY:-0}" == "1" ]]; then echo "+ $*"; eval "$@"; else echo "DRY_RUN + $*"; fi; }
echo "== host evidence =="; uname -a; command -v docker || true; command -v lxc || true; command -v virsh || true
run "sudo dnf install -y docker-ce docker-ce-cli containerd.io git firewalld || sudo dnf install -y moby-engine docker-compose-plugin git firewalld"
run "sudo systemctl enable --now docker firewalld"
run "sudo firewall-cmd --add-port=8080/tcp --permanent"
run "sudo firewall-cmd --reload"
