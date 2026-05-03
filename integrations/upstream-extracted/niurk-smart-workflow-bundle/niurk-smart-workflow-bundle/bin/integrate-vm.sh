#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

mode="${1:-integrate}"

assert_instance_running "$TARGET_VM"

write_target_env() {
  log "writing target endpoint env to $TARGET_VM"
  cat <<EOF | write_remote_file "$TARGET_VM" "/opt/niurk-directives/ai-endpoints.env"
DMR_BASE_URL=http://${AI_CONTAINER}:${DMR_PORT}
DOCKER_MODEL_RUNNER_BASE_URL=http://${AI_CONTAINER}:${DMR_PORT}
OLLAMA_BASE_URL=http://${AI_CONTAINER}:${DMR_PORT}
VLLM_BASE_URL=http://${AI_CONTAINER}:${VLLM_PORT}/v1
OPENAI_BASE_URL=http://${AI_CONTAINER}:${VLLM_PORT}/v1
OPENAI_API_BASE=http://${AI_CONTAINER}:${VLLM_PORT}/v1
OPENAI_API_KEY=${OPENAI_API_KEY}
SOURCE_VM=${SOURCE_VM}
TARGET_VM=${TARGET_VM}
AI_CONTAINER=${AI_CONTAINER}
NIURK_NAMESPACE=${NIURK_NAMESPACE}
NIURK_IDENTITY_REALM=${NIURK_IDENTITY_REALM}
EOF

  cat <<'EOF' | write_remote_file "$TARGET_VM" "/opt/niurk-directives/healthcheck.sh"
#!/usr/bin/env bash
set -euo pipefail
echo "== niurk target health =="
hostnamectl || true
uptime || true
free -h || true
df -hT || true
systemctl --failed --no-pager || true
ss -lntup || true
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
if [[ -f /opt/niurk-directives/ai-endpoints.env ]]; then
  . /opt/niurk-directives/ai-endpoints.env
  curl -fsS "$VLLM_BASE_URL/models" || true
  curl -fsS "$DMR_BASE_URL/engines/v1/models" || true
fi
EOF

  lxcexec "$TARGET_VM" chmod +x /opt/niurk-directives/healthcheck.sh
}

discover_compose() {
  log "discovering compose files on $TARGET_VM project roots"
  lxc exec "$TARGET_VM" -- bash -lc '
    mkdir -p /opt/niurk-directives
    find '"$PROJECT_ROOTS"' -maxdepth 6 \( -name compose.yaml -o -name compose.yml -o -name docker-compose.yaml -o -name docker-compose.yml \) -print 2>/dev/null \
      | sort -u | tee /opt/niurk-directives/compose-files.txt
  ' || warn "compose discovery failed"
}

deploy_services() {
  require_deploy_allowed
  log "deploy-services is intentionally conservative"
  lxc exec "$TARGET_VM" -- bash -lc '
    set -euo pipefail
    test -f /opt/niurk-directives/compose-files.txt || { echo "No compose file list"; exit 1; }
    echo "Review /opt/niurk-directives/compose-files.txt and create /opt/niurk-directives/selected-compose-files.txt"
    if [[ ! -s /opt/niurk-directives/selected-compose-files.txt ]]; then
      echo "No selected compose files; refusing blind deploy."
      exit 2
    fi
    while read -r f; do
      [[ -z "$f" ]] && continue
      [[ -f "$f" ]] || { echo "missing compose: $f"; exit 3; }
      d="$(dirname "$f")"
      echo "Deploying selected compose: $f"
      cd "$d"
      cp /opt/niurk-directives/ai-endpoints.env .env.niurk42.ai
      docker compose --env-file .env.niurk42.ai -f "$f" config >/tmp/niurk-compose-check.yaml
      docker compose --env-file .env.niurk42.ai -f "$f" up -d
    done < /opt/niurk-directives/selected-compose-files.txt
  '
}

if [[ "$mode" == "deploy-services" ]]; then
  deploy_services
  exit 0
fi

write_target_env
discover_compose
lxcexec "$TARGET_VM" /opt/niurk-directives/healthcheck.sh
ok "target VM integration completed"
