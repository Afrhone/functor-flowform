# Runbook

## Phase 1: Discovery

```bash
./bin/niurk-flow.sh status
./bin/niurk-flow.sh discover
```

Artifacts are written to `state/inventory-*`.

## Phase 2: Handshake

```bash
./bin/niurk-flow.sh handshake
./bin/niurk-flow.sh auth
```

Optional FIDO:

```bash
export FIDO_REQUIRED=1
ssh-add -L | grep sk-
./bin/niurk-flow.sh auth
```

## Phase 3: Render

```bash
./bin/niurk-flow.sh render
```

Review files in `state/rendered-*`.

## Phase 4: Deploy AI container

Verify Radeon render node on `ark-rhiz` first:

```bash
ls -l /dev/kfd /dev/dri
```

Then run:

```bash
DRY_RUN=0 ALLOW_DEPLOY=1 ALLOW_GPU_MUTATION=1 ./bin/niurk-flow.sh deploy-ai-container
```

## Phase 5: Integrate target VM

```bash
DRY_RUN=0 ALLOW_DEPLOY=1 ./bin/niurk-flow.sh integrate-vm
```

This writes `/opt/niurk-directives/ai-endpoints.env` in `niurk-42`.

## Phase 6: Select services

Inside `niurk-42`, review:

```bash
cat /opt/niurk-directives/compose-files.txt
```

Create an explicit selected list:

```bash
sudo tee /opt/niurk-directives/selected-compose-files.txt <<EOF
/rhiz/some-project/compose.yaml
EOF
```

Then:

```bash
DRY_RUN=0 ALLOW_DEPLOY=1 ./bin/niurk-flow.sh deploy-services
```

## Phase 7: Validate

```bash
./bin/niurk-flow.sh validate
```

## Phase 8: Cutover

Prepare explicit source stop commands in `niurk-21`:

```bash
lxc exec niurk-21 -- sudo tee /opt/niurk-directives/selected-source-stop.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
docker stop kobalt-edge-router rhiz-nginx-edge-https || true
EOF
lxc exec niurk-21 -- sudo chmod +x /opt/niurk-directives/selected-source-stop.sh
```

Then:

```bash
DRY_RUN=0 ALLOW_DEPLOY=1 ALLOW_SOURCE_STOP=1 \
CUTOVER_TOKEN=cutover-niurk-21-to-niurk-42 \
./bin/niurk-flow.sh cutover-check
```

The bundle still refuses to guess which source services to stop.
Run the selected stop script manually after review.
