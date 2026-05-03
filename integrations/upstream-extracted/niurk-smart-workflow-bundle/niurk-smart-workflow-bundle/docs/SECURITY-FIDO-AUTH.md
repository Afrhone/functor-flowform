# Security, FIDO and auth handshake

## What the bundle does

- Checks whether `ssh-agent` exposes keys.
- If `FIDO_REQUIRED=1`, requires at least one `sk-*` FIDO SSH key in the agent.
- Confirms LXD exec authority to source VM, target VM and AI container.
- Writes namespace claims into env files.
- Refuses to embed private secrets.

## What the bundle does not do

- It does not copy private keys.
- It does not create a new trust CA automatically.
- It does not push OAuth client secrets.
- It does not disable host security controls.

## Suggested operator model

```text
human operator
  → FIDO-backed SSH key
  → LXD admin group or sudo on cluster node
  → LXD exec into VMs/containers
  → env-file based service auth
```

## Namespace coherence

Every remote action should be attributable to:

```text
operator:kobalt
realm:rhiz/niurk
target:host:ark-rhiz/vm:niurk-42/container:niurk-ai-rocm
```

## Optional FIDO setup

Create a FIDO-backed SSH key:

```bash
ssh-keygen -t ed25519-sk -O resident -C kobalt-rhiz-fido
ssh-add ~/.ssh/id_ed25519_sk
ssh-add -L | grep sk-
```

Then:

```bash
FIDO_REQUIRED=1 ./bin/niurk-flow.sh auth
```
