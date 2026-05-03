# State machine

See `config/state-machine.yaml`.

## Operational interpretation

- `DISCOVERED`: we know what exists.
- `HANDSHAKEN`: we can talk to it.
- `AUTH_VALIDATED`: the operator and namespace are coherent.
- `TARGET_READY`: the receiving VM can host services.
- `AI_CONTAINER_READY`: the GPU/model endpoint exists or its absence is recorded.
- `SERVICES_RENDERED`: target env/compose/systemd artifacts exist.
- `SERVICES_DEPLOYED`: selected services are up.
- `VALIDATED`: target works and source still runs.
- `CUTOVER_READY`: explicit human gate supplied.
- `CUTOVER_DONE`: authority moved.

## Enforcement

The shell scripts enforce destructive gates. For stronger enforcement, wrap `bin/niurk-flow.sh` in CI or an Ansible runner that checks `state/current.json`.
