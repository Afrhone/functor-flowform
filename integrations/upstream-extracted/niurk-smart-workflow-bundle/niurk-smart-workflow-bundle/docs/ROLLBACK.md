# Rollback

Rollback is simple because the default workflow does not stop the source.

## Before cutover

Do nothing. Source remains authoritative.

## After target deploy but before source stop

```bash
lxc exec niurk-42 -- docker ps
lxc exec niurk-42 -- docker compose -f /path/to/selected/compose.yaml down
```

## After source stop

Run the inverse of the explicit selected source stop script. Example:

```bash
lxc exec niurk-21 -- docker start kobalt-edge-router rhiz-nginx-edge-https
```

## AI container rollback

```bash
lxc stop niurk-ai-rocm
```

Or remove it only after exporting any state:

```bash
lxc delete niurk-ai-rocm --force
```

## Restore env

Target env file:

```bash
lxc exec niurk-42 -- rm -f /opt/niurk-directives/ai-endpoints.env
```

## Rule

Never delete databases or volumes as part of rollback. Use explicit backups/export steps first.
