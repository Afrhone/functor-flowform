#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

need lxc

exists="$(lxc list "$AI_CONTAINER" -c n --format csv 2>/dev/null | grep -x "$AI_CONTAINER" || true)"
if [[ -z "$exists" ]]; then
  log "creating LXD container $AI_CONTAINER on $AI_HOST_NODE"
  run lxc launch "$AI_CONTAINER_IMAGE" "$AI_CONTAINER" --target "$AI_HOST_NODE"
else
  ok "$AI_CONTAINER exists"
fi

log "configuring $AI_CONTAINER"
run lxc config set "$AI_CONTAINER" security.nesting true
run lxc config set "$AI_CONTAINER" security.syscalls.intercept.mknod true
run lxc config set "$AI_CONTAINER" security.syscalls.intercept.setxattr true
run lxc config set "$AI_CONTAINER" limits.cpu 8
run lxc config set "$AI_CONTAINER" limits.memory 24GiB
run lxc config set "$AI_CONTAINER" limits.disk.priority 10

if ! lxc config device show "$AI_CONTAINER" 2>/dev/null | grep -q '^models:'; then
  run lxc config device add "$AI_CONTAINER" models disk "source=$HOST_MODEL_DIR" "path=$CONTAINER_MODEL_DIR"
else
  ok "models disk already attached"
fi

if [[ "${ALLOW_GPU_MUTATION:-0}" == "1" ]]; then
  if ! lxc config device show "$AI_CONTAINER" 2>/dev/null | grep -q '^gpu:'; then
    run lxc config device add "$AI_CONTAINER" gpu gpu gputype=physical
  fi
  if ! lxc config device show "$AI_CONTAINER" 2>/dev/null | grep -q '^kfd:'; then
    run lxc config device add "$AI_CONTAINER" kfd unix-char "path=$ROCM_KFD_NODE"
  fi
  if ! lxc config device show "$AI_CONTAINER" 2>/dev/null | grep -q '^dri-render:'; then
    run lxc config device add "$AI_CONTAINER" dri-render unix-char "path=$ROCM_RENDER_NODE"
  fi
else
  warn "ALLOW_GPU_MUTATION!=1, not adding GPU devices. Set ALLOW_GPU_MUTATION=1 after verifying /dev/kfd and renderD node on $AI_HOST_NODE."
fi

if [[ "$(instance_state "$AI_CONTAINER")" != "RUNNING" ]]; then
  run lxc start "$AI_CONTAINER"
fi

if ! dry; then
  lxc exec "$AI_CONTAINER" -- bash -lc '
    set -euo pipefail
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release jq git htop iotop sysstat gettext-base

    if ! command -v docker >/dev/null 2>&1; then
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      . /etc/os-release
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-model-plugin
    else
      apt-get install -y docker-model-plugin || true
    fi

    systemctl enable --now docker
    docker version
    docker compose version
    docker model version || true
  '

  lxc exec "$AI_CONTAINER" -- mkdir -p /opt/vllm-rocm /opt/niurk-ai-gateway
  lxc file push "$NIURK_ROOT/compose/vllm-rocm.compose.yaml" "$AI_CONTAINER/opt/vllm-rocm/compose.yaml"
  lxc file push "$NIURK_ROOT/compose/intuitive-ai-gateway.compose.yaml" "$AI_CONTAINER/opt/niurk-ai-gateway/compose.yaml"
  lxc file push "$NIURK_ROOT/compose/nginx.conf" "$AI_CONTAINER/opt/niurk-ai-gateway/nginx.conf"

  lxc exec "$AI_CONTAINER" -- bash -lc "
    set -euo pipefail
    export VLLM_MODEL='$VLLM_MODEL'
    export VLLM_PORT='$VLLM_PORT'
    export VLLM_MAX_MODEL_LEN='$VLLM_MAX_MODEL_LEN'
    export VLLM_GPU_MEMORY_UTILIZATION='$VLLM_GPU_MEMORY_UTILIZATION'
    export CONTAINER_MODEL_DIR='$CONTAINER_MODEL_DIR'

    docker model install-runner --backend llama.cpp --gpu rocm || true
    docker model pull '$DOCKER_MODEL_RUNNER_MODEL' || true

    cd /opt/vllm-rocm
    docker compose pull
    docker compose up -d

    cd /opt/niurk-ai-gateway
    docker compose up -d
  "
else
  log "DRY_RUN: would install Docker Engine, docker-model-plugin, Docker Model Runner and vLLM ROCm compose"
fi

ok "AI container directive completed"
