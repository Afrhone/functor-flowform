# MCP-lite tools

Run:

```bash
cd services/mcp
node flowforms-mcp.js
```

JSON-RPC examples:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"flowforms.formalize","arguments":{}}}
```

Tools:

- `flowforms.listGlyphs`
- `flowforms.generateVariant`
- `flowforms.formalize`
- `cluster.plan`
