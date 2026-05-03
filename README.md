# Flowforms Axiom Playground Bundle

A complete symbolic alphabet + HTML5 canvas/SVG vector playground + formal Lagrangian/ODE expression engine + CMS/API + SSO-ready Docker deployment + MCP-lite bridge + cluster integration scripts.

The bundle expands the seed sketch into a living glyph system: root → graphème → phonème → path → font → animated symbol.

## Quick start

```bash
cd web
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## What is inside

```text
web/                      interactive HTML5 Canvas/SVG playground
web/assets/glyphs.json     complete glyph alphabet, numerals, symbols
web/fonts/                 generated Flowforms TTF + SVG font source
web/specimens/             SVG planches and symbol deck
services/api/              CMS + glyph registry + SSO-ready API
services/mcp/              MCP-lite JSON-RPC tool bridge
agents/                    assertive agent policies and validators
deploy/swarm/              Docker Swarm stack automation
deploy/lxd/                LXD profile + health checks
deploy/libvirt/            libvirt bridge checks
deploy/fedora/             Fedora host bootstrap, dry-run first
docs/                      math formalization, deployment, SSO, cluster notes
integrations/              uploaded upstream bundles preserved and extracted
```

## Formal engine

The core expression is:

```math
Fθ(s;r,p,a)=Aθ(ΣBᵢ(s)Pᵢ + Φroot + Φrhythm + Φaxiom)
```

with Lagrangian:

```math
L(q,q̇,t)=1/2 q̇ᵀMq̇ - V(q,t;r,p,a)+A(q,t)·q̇
```

and generic ODE:

```math
M q̈ + C q̇ + ∇V(q,t) - B(q,t)q̇ = u(t).
```

See `docs/MATH-FORMALIZATION.md` for the full derivation.

## Container development

```bash
cp .env.example .env
docker compose up --build
```

With SSO/MCP profiles:

```bash
COMPOSE_PROFILES=sso,mcp docker compose up --build
```

## Swarm

```bash
cp deploy/swarm/stack.env.example deploy/swarm/stack.env
DRY_RUN=1 ./deploy/swarm/deploy-stack.sh
APPLY=1 ./deploy/swarm/deploy-stack.sh
```

## Safety

Host and cluster scripts default to dry-run. They print evidence before mutation and require `APPLY=1` for changes.
