# SSO and security notes

The API ships in `SSO_MODE=dev` so the bundle can run immediately. For production:

1. Put the API behind an OIDC-aware reverse proxy or configure JWT verification with `OIDC_ISSUER` and `OIDC_AUDIENCE`.
2. Use Keycloak realm import at `deploy/keycloak/flowforms-realm.json` as a development baseline.
3. Store secrets in Docker secrets, not `.env` files.
4. Keep cluster scripts in dry-run mode until health checks pass.
5. MCP tools are intentionally scoped to glyph generation, formalization, and dry-run cluster plans.
