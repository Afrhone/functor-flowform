# K5000 legacy GPU directive

## Constraint

A Quadro K5000 is a legacy NVIDIA GPU. Treat it as a host-local legacy capability, not a modern inference target.

## Valid uses

- Legacy CUDA/OpenGL workflows that match its driver generation.
- Display / visualization passthrough experiments.
- Fallback service on the VM located on the physical host that owns the card.

## Invalid uses

- Current vLLM GPU inference.
- Docker Model Runner NVIDIA backend requiring modern NVIDIA drivers.
- Acceleration for a VM on another LXD cluster node.

## Directive

Modern AI serving target:

```text
ark-rhiz Radeon 16 GB → LXD container niurk-ai-rocm → Docker Model Runner + vLLM ROCm
```

Legacy target:

```text
K5000 physical host → same-host VM only → legacy NVIDIA driver path
```

## Attach only during maintenance

For a VM, GPU device mutation should be treated as maintenance:

```bash
ALLOW_GPU_MUTATION=1
ALLOW_VM_RESTART=1
```

Never mutate GPU assignment during service cutover unless the VM is explicitly scheduled for restart.
