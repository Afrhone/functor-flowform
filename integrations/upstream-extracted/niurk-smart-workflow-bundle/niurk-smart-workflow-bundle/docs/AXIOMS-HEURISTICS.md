# Logical dynamical axiomatic and heuristics

## Axiom 1 — locality of physical capability

A hardware resource belongs to the physical host where the kernel enumerates it.

Consequence: a K5000 present on one host cannot accelerate a VM on another LXD node. To change this, move the physical GPU, migrate the VM to the GPU host, or expose a network service endpoint from the GPU host.

## Axiom 2 — authority is explicit

A source service remains authoritative until target service validation passes and a cutover token is supplied.

Consequence: discovery, rendering and target deployment never stop source services.

## Axiom 3 — identity is typed

Identity is not an IP alone. Identity is the tuple:

```text
entity_type + namespace + stable name + authority + observed location
```

Examples:

```text
host:rhiz/host/ark-rhiz@lxd_cluster
vm:rhiz/vm/niurk-42@ark-rhiz
container:rhiz/container/niurk-ai-rocm@ark-rhiz
endpoint:rhiz/models/http://niurk-ai-rocm:8000/v1
```

## Axiom 4 — endpoint is a contract

Applications depend on contract endpoints, not on hidden process names.

The automation writes:

```text
OPENAI_BASE_URL=http://niurk-ai-rocm:8000/v1
DMR_BASE_URL=http://niurk-ai-rocm:12434
```

Applications should consume the env file rather than hard-code container internals.

## Axiom 5 — state transition beats script sequence

The workflow is a state machine. A command is valid only if its prior state predicates hold.

```text
INIT
  → DISCOVERED
  → HANDSHAKEN
  → AUTH_VALIDATED
  → TARGET_READY
  → AI_CONTAINER_READY
  → SERVICES_RENDERED
  → SERVICES_DEPLOYED
  → VALIDATED
  → CUTOVER_READY
  → CUTOVER_DONE
```

## Heuristics

### H1 — swap storm blocks cutover

If swap use exceeds 50%, do not cut over. Defer to memory recovery.

### H2 — I/O wait is stronger than bandwidth

A VM can show only 5 MB/s disk read and still be unusable if `await`, `aqu-sz`, or `%util` are high.

### H3 — crash-loop containers are not services

A container in restart loop is a fault signal, not an asset to migrate. Render its intended endpoint, then redeploy with a compatible runtime.

### H4 — GPU runtime must match device generation

- Radeon 16 GB on `ark-rhiz`: target Docker Model Runner llama.cpp / vLLM ROCm.
- Quadro K5000: legacy fallback only, not modern vLLM.

### H5 — namespace coherence before auth delegation

Before any remote config applies, the target identity must match:

```text
host:ark-rhiz/vm:niurk-42/container:niurk-ai-rocm
```

### H6 — FIDO verifies operator, not machine health

FIDO is a human/operator assertion. It does not replace LXD location checks, health checks, or endpoint validation.

## Readiness scoring

`bin/logical-heuristics.sh` computes a transparent score. Penalties apply for swap, iowait, high load, missing endpoints or identity mismatch. Cutover should require score ≥ 70.
