# Git Website Alignment (Cloudflare)

This runbook keeps Cloudflare website applications aligned with their source Git repositories.

## Source of truth

- Mapping file: `infra/cloudflare/git-website-alignment.json`
- Binding catalog + primary IDs: `infra/bindings.json`
- Validator: `scripts/cloudflare/validate-git-website-alignment.mjs`

## What this prevents

- Two active repos deploying the same app name.
- Two active apps targeting the same domain.
- Multiple active API apps for canonical domains (`api.goldshore.org`, `api.goldshore.ai`).
- Missing assignment coverage for required repos: `goldshore-core`, `rmarston.github.io`, `banproof.me`, `armsway.com`, `goldshore`, `goldshore-ai`.

## Workflow

1. Update `infra/cloudflare/git-website-alignment.json` when adding, renaming, or retiring apps.
2. Run:
   ```bash
   npm run audit:websites
   ```
3. If the command fails, resolve duplicate domain/app ownership before deployment.

## Status labels

- `active`: currently deployed and expected to stay online.
- `canonical`: authoritative app for a critical domain.
- `planned`: intended destination during migration.
- `legacy`: old app still present but not authoritative.
- `orphaned`: app found in config/history and should be retired.

## Manual cutover gate

For the current `.ai`/`.org` transition, use the dashboard-only sequence in `docs/cloudflare/manual-cutover-gate.md` and finish all verification checks before deploy/cutover.

