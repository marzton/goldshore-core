# Gold Shore Labs production secret contract

## Scope

This contract governs `GS-WEB-PROD`, `gs-api-prod`, `gs-gateway-prod`, and `gs-mcp-agent-prod`.

## Storage rules

- Never commit secret values to Git.
- Never store API keys, access tokens, signing keys, or client secrets in Cloudflare KV.
- Use GitHub Actions environment secrets for CI/CD credentials.
- Use Cloudflare Workers Secrets or Cloudflare Secrets Store for Worker runtime credentials.
- Use KV only for non-secret runtime configuration, feature flags, routing metadata, and public identifiers.
- Production secrets must not be inherited by preview deployments unless explicitly approved.

## Canonical secret names

### OpenAI

- `OPENAI_API_KEY`
- `OPENAI_PROJECT_ID`
- `OPENAI_ORGANIZATION_ID`

### Cloudflare

- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`
- `CF_MCP_AGENT_TOKEN`
- `ACCESS_ISSUER`
- `ACCESS_AUDIENCE`
- `ACCESS_JWKS_URL`
- `SERVICE_TOKEN_CLIENT_ID`
- `SERVICE_TOKEN_CLIENT_SECRET`
- `SESSION_SIGNING_KEY`

### GitHub / MCP

- `GH_MCP_AGENT_TOKEN`
- `GH_MCP_AGENT_APP_ID`
- `GH_MCP_AGENT_INSTALLATION_ID`

## Non-secret KV configuration

Recommended `GS_CONFIG` keys:

- `brand.name=Gold Shore Labs`
- `environment=production`
- `domains.primary=goldshore.org`
- `domains.mirror=goldshore.ai`
- `origins.admin=https://admin.goldshore.org`
- `origins.api=https://api.goldshore.org`
- `access.team_domain=goldshore.cloudflareaccess.com`
- `openai.project_name=Ops`

Do not place `OPENAI_API_KEY`, `CF_API_TOKEN`, `GH_MCP_AGENT_TOKEN`, Access service-token secrets, or signing keys in KV.

## GitHub Actions environment

Create an environment named `GS-WEB-PROD` and store CI/CD secrets there. Workflows must reference secrets through `${{ secrets.NAME }}` and must not print values.

Recommended environment protections:

- Required reviewer for production deploys
- Deployment branch limited to `main`
- No pull-request workflow access to production secrets
- Secret scanning and push protection enabled

## Cloudflare bindings

Workers should declare only secret names and bindings in source control. Values are installed out-of-band.

```toml
[vars]
ENVIRONMENT = "production"
PUBLIC_BRAND_NAME = "Gold Shore Labs"
PUBLIC_PRIMARY_DOMAIN = "goldshore.org"
PUBLIC_MIRROR_DOMAIN = "goldshore.ai"

[[kv_namespaces]]
binding = "GS_CONFIG"
id = "<production-kv-id>"
```

Runtime secrets:

```text
OPENAI_API_KEY
CF_MCP_AGENT_TOKEN
GH_MCP_AGENT_TOKEN
ACCESS_AUDIENCE
SESSION_SIGNING_KEY
```

## Rotation procedure

1. Create a replacement key in the correct provider/project.
2. Install the replacement in Cloudflare Workers Secrets/Secrets Store.
3. Install the replacement in the GitHub `GS-WEB-PROD` environment only when CI requires it.
4. Deploy and verify health checks without exposing the value.
5. Revoke the old credential.
6. Record only key name, provider, project, creation date, rotation date, and owner—not the secret value.
