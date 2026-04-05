# Legacy Retirement Checklist

Use this checklist before deleting any legacy worker, route, or endpoint. Completion is **required** for decommission PRs.

## Scope

Complete one row per retiring worker/path pair.

| Worker | Legacy path/endpoint | Owning team | Target delete release |
| --- | --- | --- | --- |
| _example: api-gateway_ | _example: /v1/legacy/orders_ | _example: Core API_ | _example: 2026.17_ |

## Objective Exit Criteria (all required)

### 1) Traffic has dropped below threshold for N consecutive days
- [ ] Define threshold: `__ requests/day`.
- [ ] Define observation window: `__ consecutive days`.
- [ ] Verify measured traffic is below threshold for entire window.
- [ ] Attach evidence (dashboard/query link + timestamp).

### 2) Zero critical errors during the same window
- [ ] Confirm severity-1/severity-2 (or equivalent “critical”) errors are `0` for the worker/path in the observation window.
- [ ] Attach evidence (error tracker/query link + timestamp).

### 3) Rollback path is unused for N releases
- [ ] Define required release count: `__ releases`.
- [ ] Confirm no rollback to legacy path/worker across all required releases.
- [ ] Attach evidence (deploy logs/release notes).

### 4) Dependency map is cleared
- [ ] Enumerate direct callers/dependencies (services, jobs, clients, external consumers).
- [ ] Confirm each dependency has migrated or been removed.
- [ ] Validate no runtime references remain (search + traffic verification).
- [ ] Attach updated dependency map artifact.

## Sign-offs

- [ ] Owning team approval:
- [ ] Platform/SRE approval:
- [ ] Product or domain owner approval (if customer-facing):

## Required PR metadata for deletion

Every decommission/deletion PR must include:

- [ ] ✅ `Legacy retirement checklist completed` (checked in PR body)
- [ ] ✅ ADR reference (e.g., `ADR-0123` or link to `docs/adr/...`)
- [ ] ✅ Link to this checklist (or committed copy in `docs/migration/`)

