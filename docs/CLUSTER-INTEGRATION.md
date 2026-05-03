# Low-level cluster integration map

```text
Browser UI → web container → API/CMS → glyph JSON + assets
                      ↘ MCP bridge → agent assertions → deployment plans
Docker Swarm overlay → web/api/mcp replicas
LXD/libvirt host checks → optional containers/VM profile launchers
SSO layer → Keycloak/OIDC or reverse-proxy validated identity
```

Ports used by default:

- Web: `8080` local, `80/443` behind reverse proxy.
- API: `8081` host-published in dev compose.
- MCP bridge: local stdio by default; optional container process.
- Keycloak: `8088` dev only.

Safety:

- `APPLY=1` is required for any mutation script.
- `DRY_RUN=1` is the default.
- Host scripts print diagnostic evidence first: `docker info`, `lxc version`, `virsh net-list`, `ss -lntup`, and firewalld zones when available.
