# Sprint 1 Execution Plan (Edge-to-Core Foundation)

## Sprint window
- Duration: 2 weeks
- Objective: Stand up the secure edge-to-core request path and contract governance so read-only endpoint cutover can begin safely.

## Scope
1. Finalize edge-to-core authentication contract.
2. Publish `/v1` OpenAPI baseline and generated SDK.
3. Route health/version endpoints through edge adapter.
4. Add minimum end-to-end observability fields.
5. Enforce contract and client compatibility in CI.

## Jira-ready backlog

### EPIC S1-01 — Edge/Core trust contract

#### Story S1-01-A — ADR for machine-to-machine auth
**Description**
Define how `apps/api` authenticates to `goldshore-core` including token type, claims, TTL, audience, and rotation.

**Acceptance criteria**
- ADR merged in `docs/adr/`.
- Required claims documented (`iss`, `aud`, `sub`, `scope`, `exp`, `iat`).
- Rotation and emergency revoke runbook linked.

#### Story S1-01-B — Shared verifier and tests
**Description**
Implement a reusable token verification function for edge and core integration points.

**Acceptance criteria**
- Verifier exported from shared auth package.
- Tests cover: missing claim, wrong `aud`, expired token, bad signature.
- All tests pass in CI.

---

### EPIC S1-02 — Contract-first API baseline

#### Story S1-02-A — OpenAPI v1 baseline
**Description**
Define initial `/v1` contract for `GET /health`, `GET /version`, and `POST /contact` schema.

**Acceptance criteria**
- Source contract committed in `packages/contracts/openapi/`.
- Contract lints cleanly.
- Release notes/changelog entry created for initial version.

#### Story S1-02-B — Client codegen pipeline
**Description**
Generate typed client SDK from contract and publish local package artifact used by app adapters.

**Acceptance criteria**
- Generated client committed under `packages/contracts/generated/`.
- `apps/admin-dashboard` and/or `apps/goldshore-ai` can import the client.
- CI fails on stale generated artifacts.

---

### EPIC S1-03 — Thin edge adapter forwarding

#### Story S1-03-A — Health/version forwarding
**Description**
Implement route forwarding in edge adapter from `apps/api` to core health/version endpoints.

**Acceptance criteria**
- `GET /v1/health` and `GET /v1/version` served via adapter.
- Non-2xx core responses map to stable error envelope.
- Integration tests cover success and failure mapping.

#### Story S1-03-B — Error envelope standardization
**Description**
Define and enforce consistent error shape returned to clients.

**Acceptance criteria**
- Error schema documented in contract.
- Adapter returns `code`, `message`, and `trace_id` fields.
- Tests validate envelope for 4xx and 5xx.

---

### EPIC S1-04 — Observability and rollout gates

#### Story S1-04-A — Trace correlation fields
**Description**
Log standard telemetry fields at edge and core boundaries.

**Acceptance criteria**
- Required fields: `trace_id`, `request_id`, `route`, `status_code`, `latency_ms`.
- Edge and core logs include same `trace_id` for forwarded requests.
- Example dashboard/query documented.

#### Story S1-04-B — Rollout gate thresholds
**Description**
Define objective migration gates for promoting endpoints.

**Acceptance criteria**
- Gate thresholds documented (`error-rate delta`, `p95 latency`, parity mismatch).
- CI/CD references gate doc before deploy promotion.
- On-call runbook includes rollback trigger conditions.

---

### EPIC S1-05 — CI compatibility enforcement

#### Story S1-05-A — Contract breaking-change check
**Description**
Prevent unversioned breaking API changes.

**Acceptance criteria**
- CI job compares OpenAPI change class.
- Breaking changes require major bump or explicit override process.
- PR status check blocks merge when policy violated.

#### Story S1-05-B — Consumer SDK compatibility check
**Description**
Ensure app adapters consume compatible SDK versions.

**Acceptance criteria**
- CI job validates SDK compatibility in this repo.
- Failure message points to upgrade guide.
- Upgrade path documented in `docs/api/consumer-upgrade.md`.

## Out of scope (Sprint 1)
- Full write-path migration to core for all endpoints.
- Legacy worker deletion.
- Admin mutation cutover.

## Risks and mitigations
- **Risk**: Auth ambiguity causes inconsistent implementations.
  - **Mitigation**: ADR must be approved before route cutover stories begin.
- **Risk**: Contract drift between generated SDK and source.
  - **Mitigation**: CI stale-artifact check required.
- **Risk**: Migration go/no-go decisions become subjective.
  - **Mitigation**: Use explicit rollout gates and dashboard links in PR template.

## Definition of done
- Edge can forward health/version to core with authenticated requests.
- Core and edge logs correlate through shared trace IDs.
- Contract + SDK pipeline is enforced in CI.
- Migration gates are documented and referenced by deploy workflow.
