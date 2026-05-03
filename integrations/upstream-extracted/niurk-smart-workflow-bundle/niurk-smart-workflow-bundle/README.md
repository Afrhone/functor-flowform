# niurk smart workflow automation bundle

This bundle is a dry-run-first deployment/runbook repo for the current LXD rhiz cluster.

It is designed for:

- moving application services from `niurk-21` toward `niurk-42`;
- keeping source services alive until target validation passes;
- creating an intuitive LXD AI container on `ark-rhiz` for Docker Model Runner and vLLM ROCm;
- exposing coherent model endpoints to VMs and application stacks;
- validating host / VM / container / namespace / identity / auth state before cutover;
- preventing accidental source shutdown, GPU misplacement, or vLLM crash loops.

The bundle includes the uploaded recovery archive at `upstream/niurk-ops-recovery.zip` for continuity.

## Current cluster encoded in `env/niurk-cluster.env`

```text
ark-rhiz       192.168.0.40  ONLINE
factau-rhiz    192.168.0.4   ONLINE database-standby
rhiz-ueth      192.168.0.2   ONLINE database
rhiz-woute     192.168.0.33  ONLINE database-standby
sigmo-rhiz     192.168.0.34  ONLINE database-leader,database
umowt-rhiz     192.168.0.36  ONLINE database

llama-gpu      container       ark-rhiz   192.168.0.125
niurk-19       virtual-machine sigmo-rhiz 192.168.0.124
niurk-21       virtual-machine rhiz-ueth  192.168.0.21
niurk-42       virtual-machine ark-rhiz   192.168.0.42
niurk-72       virtual-machine rhiz-woute stopped
project-push   container       ark-rhiz   stopped
```

Note: the message text mentioned `niurk-21` on `sigmo-rhiz`, but the provided `lxc list` shows `niurk-21` on `rhiz-ueth`. The automation treats the LXD listing as source-of-truth and keeps an alternate expected node variable for warning only.

## Safety defaults

Nothing destructive runs by default.

```bash
DRY_RUN=1
ALLOW_DEPLOY=0
ALLOW_SOURCE_STOP=0
ALLOW_VM_RESTART=0
```

To execute a real deploy, edit `env/niurk-cluster.env` or export:

```bash
export DRY_RUN=0
export ALLOW_DEPLOY=1
```

To stop source services during cutover, you must also set:

```bash
export ALLOW_SOURCE_STOP=1
export CUTOVER_TOKEN="cutover-niurk-21-to-niurk-42"
```

## Quick start

```bash
unzip niurk-smart-workflow-bundle.zip
cd niurk-smart-workflow-bundle

# 1. Review config
less env/niurk-cluster.env
less config/state-machine.yaml
less config/ontology.yaml

# 2. Non-destructive discovery
./bin/niurk-flow.sh status
./bin/niurk-flow.sh discover
./bin/niurk-flow.sh check
./bin/niurk-flow.sh handshake

# 3. Render target files locally without deployment
./bin/niurk-flow.sh render

# 4. Real deployment to ark-rhiz / niurk-42 / AI container
DRY_RUN=0 ALLOW_DEPLOY=1 ./bin/niurk-flow.sh deploy-ai-container
DRY_RUN=0 ALLOW_DEPLOY=1 ./bin/niurk-flow.sh integrate-vm

# 5. Validate before any cutover
./bin/niurk-flow.sh validate

# 6. Cutover is locked unless explicitly enabled
DRY_RUN=0 ALLOW_DEPLOY=1 ALLOW_SOURCE_STOP=1 \
CUTOVER_TOKEN=cutover-niurk-21-to-niurk-42 \
./bin/niurk-flow.sh cutover
```

## Important GPU model decision

The Quadro K5000 is legacy. Keep it as a compatibility fallback on the host/VM where it physically exists. Do not target it for modern vLLM. Deploy modern AI serving on `ark-rhiz` via the existing Radeon 16 GB path.

Use:

- `Docker Model Runner` with `llama.cpp` backend for simple OpenAI/Ollama-compatible local inference;
- `vLLM ROCm` directly via `vllm/vllm-openai-rocm` for AMD GPU inference.

## Bundle map

```text
bin/
  niurk-flow.sh                 main orchestration entrypoint
  system-check.sh               host/vm/container checks
  deploy-ai-container.sh        LXD Ubuntu container + Docker Model Runner + vLLM ROCm
  integrate-vm.sh               target VM integration env + endpoint handoff
  service-inventory.sh          source/target service inventory
  remote-handshake.sh           LXD/SSH/FIDO/auth handshake checks
  validate.sh                   endpoint and service validation
  state-machine.sh              transition gate helper
  render-compose.sh             compose/env renderer
  logical-heuristics.sh         scoring/gating heuristics
  lib/niurk-lib.sh              shared functions

env/
  niurk-cluster.env             editable deployment config
  identity.env.example          FIDO/SSH/auth variables
  services.env.example          service routing map

config/
  state-machine.yaml            declarative state machine
  ontology.yaml                 identity/namespace ontology
  service-map.yaml              observed service classes
  policy.yaml                   safety policy and thresholds

compose/
  vllm-rocm.compose.yaml
  intuitive-ai-gateway.compose.yaml

docs/
  AXIOMS-HEURISTICS.md
  RUNBOOK.md
  SECURITY-FIDO-AUTH.md
  K5000-LEGACY-GPU.md
  STATE-MACHINE.md
  ROLLBACK.md
```

## Principle

The automation is a bounded controller:

```text
discover → handshake → validate identity → render → deploy target → validate → cutover
```

No identity coherence, no deploy. No endpoint validation, no cutover.
