#!/usr/bin/env bash
set -euo pipefail
NIURK_ROOT="${NIURK_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
. "$NIURK_ROOT/bin/lib/niurk-lib.sh"

dist="$NIURK_ROOT/state/rendered-$TS"
mkdir -p "$dist"

log "rendering AI compose and target env into $dist"

envsubst < "$NIURK_ROOT/compose/vllm-rocm.compose.yaml" > "$dist/vllm-rocm.compose.yaml" || cp "$NIURK_ROOT/compose/vllm-rocm.compose.yaml" "$dist/"
envsubst < "$NIURK_ROOT/compose/intuitive-ai-gateway.compose.yaml" > "$dist/intuitive-ai-gateway.compose.yaml" || cp "$NIURK_ROOT/compose/intuitive-ai-gateway.compose.yaml" "$dist/"

cat > "$dist/niurk42-ai-endpoints.env" <<EOF
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
EOF

cat > "$dist/apply-on-target.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/niurk-directives
cp niurk42-ai-endpoints.env /opt/niurk-directives/ai-endpoints.env
echo "Wrote /opt/niurk-directives/ai-endpoints.env"
EOF
chmod +x "$dist/apply-on-target.sh"

ok "rendered files:"
find "$dist" -maxdepth 1 -type f -print
