#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
ENV_FILE=${ENV_FILE:-$HERE/stack.env}
if [[ ! -f "$ENV_FILE" ]]; then cp "$HERE/stack.env.example" "$ENV_FILE"; echo "Created $ENV_FILE; review then rerun."; exit 0; fi
set -a; source "$ENV_FILE"; set +a
run(){ if [[ "${APPLY:-0}" == "1" ]]; then echo "+ $*"; eval "$@"; else echo "DRY_RUN + $*"; fi; }
echo "== Docker evidence =="; docker info --format 'Swarm={{.Swarm.LocalNodeState}} Node={{.Name}}' || true
echo "== Images =="; run "docker build -t ${FLOWFORMS_WEB_IMAGE} -f Dockerfile.web $ROOT"; run "docker build -t ${FLOWFORMS_API_IMAGE} -f services/api/Dockerfile $ROOT"; run "docker build -t ${FLOWFORMS_MCP_IMAGE} -f services/mcp/Dockerfile $ROOT"
echo "== Stack deploy =="; run "docker stack deploy -c $HERE/docker-stack.yml ${STACK_NAME:-flowforms}"
