# 🏛️ Gold Shore Core
**The Unified Infrastructure & Agency Gateway**

`goldshore-core` is a high-performance monorepo orchestrating a tiered SaaS ecosystem. It uses **Cloudflare Workflows** for stateful AI tasks and a unified **D1/KV Identity Layer**.

## 🛠️ Monorepo Structure
- **/apps/goldshore-ai**: Agency Marketing (Astro + Tailwind).
- **/apps/banproof-me**: Durable Signal Engine (Hono + React).
- **/apps/admin-dashboard**: Sudo/Owner Control Panel.
- **/packages/identity**: Unified Auth (JWT/RBAC) logic.
- **/packages/database**: D1 Migrations & Schemas.

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
