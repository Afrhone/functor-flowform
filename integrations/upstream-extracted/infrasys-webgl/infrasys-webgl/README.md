# LXD Info System — Native JS WebGL Bundle

Interactive WebGL visualization for the LXD cluster architecture:

- LXD cluster members
- LXD VMs / containers
- Docker / Swarm / MCP / API agents
- Ollama / Llama model services
- weighted relations: `hosts`, `contains`, `runs`, `routes`, `joins`, `accesses`, `depends`
- graph-theory style rules: isomorphism, commutativity, inflexion, encapsulation
- camera orbit, zoom, keyboard control, pointer selection, labels, metrics

No framework. No build step. Native JavaScript modules + WebGL canvas.

---

## Run

From the bundle folder:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

You can also serve it with nginx/caddy or any static file server.

---

## Controls

| Control | Action |
|---|---|
| mouse drag | orbit camera |
| mouse wheel | zoom |
| right mouse drag / shift + drag | pan |
| click node | select node |
| W / S | zoom in / out |
| A / D | orbit left / right |
| Q / E | orbit up / down |
| Space | pause / resume simulation |
| R | reset camera |
| F | toggle force simulation |
| L | toggle labels |
| 1 / 2 / 3 / 4 | switch views |
| gamepad left stick | orbit |
| gamepad right stick | pan / pitch |
| gamepad triggers | zoom |

---

## Bundle structure

```text
index.html
src/
  main.js
  styles.css
  data/clusterData.js
  engine/
    CanvasApp.js
    Camera.js
    GLUtils.js
  graph/
    Node.js
    Edge.js
    ForceLayout.js
  math/
    Vec3.js
  rules/
    GraphRules.js
  ui/
    HUD.js
```

---

## Architecture model

The visualization uses this encapsulation:

```text
Cluster member
  → LXD cluster
    → LXD instance: VM or container
      → guest OS / process layer
        → Docker / Swarm / API agents / MCP / model APIs
```

Important principle:

```text
Model APIs should be routed through gateway/service layers,
not exposed directly on every VM.
```

---

## Notes for your cluster

The dataset is based on the provided `lxc cluster list` and `lxc list` output:

- `sigmo-rhiz` is marked as `database-leader`
- `niurk-19` is hosted on `sigmo-rhiz`
- `llama-gpu` and `niurk-42` are hosted on `ark-rhiz`
- `niurk-21` is hosted on `rhiz-ueth`
- `niurk-72` is stopped on `rhiz-woute`
- `project-push` is stopped on `ark-rhiz`
- `niurk-19` includes many Docker bridge networks, represented as a high network-entropy VM

