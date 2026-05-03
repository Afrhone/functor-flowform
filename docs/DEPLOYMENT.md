# Deployment and integration guide

## Local playground

```bash
cd web
python3 -m http.server 8080
# open http://localhost:8080
```

## Development containers

```bash
cp .env.example .env
COMPOSE_PROFILES=dev docker compose up --build
```

Services:

- `web`: static HTML5 canvas/SVG playground.
- `api`: JSON CMS, glyph registry, agent assertion API.
- `mcp`: MCP-lite stdio bridge for tool calls.
- `postgres` + `keycloak`: SSO/OIDC development realm.

## Docker Swarm

```bash
cp deploy/swarm/stack.env.example deploy/swarm/stack.env
DRY_RUN=1 ./deploy/swarm/deploy-stack.sh
APPLY=1 ./deploy/swarm/deploy-stack.sh
```

## Fedora host bootstrap

All host scripts are safe by default and only echo commands unless `APPLY=1` is set.

```bash
DRY_RUN=1 ./deploy/fedora/bootstrap-flowforms-host.sh
```

## LXD / libvirt / VM cluster integration

The included scripts are integration adapters. They check ports, routes, profiles, and service state before touching anything.

```bash
./deploy/lxd/lxd-healthcheck.sh
DRY_RUN=1 ./deploy/lxd/launch-flowforms-container.sh
./deploy/libvirt/libvirt-bridge-check.sh
```

Use these as graft points for your existing rhiz/niurk LXD, libvirt, Ceph, and Docker Swarm environment.
