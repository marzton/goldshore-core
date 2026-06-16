# goldshore-core — Core Worker (Deprecated)

## Status
This worker (`goldshore-core` on CF) has been superseded by `gs-api`.
**No new features should be added here.**

## Migration target
All routes → `marzton/goldshore-api` → `gs-api` Worker → `api.goldshore.ai`

## 🧠 Core Technologies
- **Compute**: Cloudflare Workers & Workflows.
- **Data**: Cloudflare D1 (SQL) & KV (Caching).
- **AI**: Workers AI (Llama-3, Phi-2) & Hugging Face.
- **Design**: Brutalist Precision (Syne + IBM Plex Mono).

## 🚀 Deployment
Managed via the `marzton` personal account to maximize free-tier Actions and storage.

## Cloudflare Binding Audit

- Canonical D1/KV resource IDs live in `infra/bindings.json`.
- `infra/bindings.json` also includes an observed KV/R2/D1 catalog for cross-repo Cloudflare consolidation.
- Run `npm run audit:cloudflare` to verify all app `wrangler.toml` files use the same shared IDs before deploy.
- Git website-to-Cloudflare app ownership is tracked in `infra/cloudflare/git-website-alignment.json`.
- Current required coverage: `goldshore-core`, `rmarston.github.io`, `banproof.me`, `armsway.com`, `goldshore`, `goldshore-ai`.
- Run `npm run audit:websites` to catch duplicate active domains/app names before deploy.
- `apps/goldshore-ai/package-lock.json` is committed so Cloudflare Pages `npm clean-install` works when the project root is set to that app directory.

## Edge/Core Observability

- Telemetry envelope + dashboard query definitions: `docs/edge-core-observability.md`
- CI/CD rollout promotion gates: `docs/ci-cd-rollout-gates.md`
- Sprint 1 execution backlog: `docs/planning/sprint-1-execution.md`
## Cloudflare Account
- **Worker:** `goldshore-core` (still deployed, needs decommission)
- **Account:** Gold Shore Labs (`f77de112d2019e5456a3198a8bb50bd2`)
