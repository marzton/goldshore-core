# ADR 0001: `gs-api` to `goldshore-core` service authentication

- Status: Accepted
- Date: 2026-04-04
- Owners: Platform / Security

## Context

`gs-api` (edge adapter worker) calls `goldshore-core` internal endpoints. We need a shared pattern that is lightweight for Cloudflare Worker execution, auditable in CI, and resilient to replay.

## Decision

We will use **signed JWT service tokens** instead of mTLS as the primary mechanism for `gs-api -> goldshore-core`.

### Why JWT over mTLS/service token alternatives

- **Chosen: JWT (HS256 shared secret in current phase)**
  - Works in Worker runtime without certificate lifecycle complexity.
  - Can carry identity + authorization (`sub`, `scope`) in a single artifact.
  - Allows strict audience pinning and short-lived credentials.
- **Deferred: mTLS**
  - Strong channel auth but operationally heavier for cert issuance/rotation and edge runtime distribution.
  - Keep as future option for high-assurance east-west traffic.
- **Rejected: opaque static service token only**
  - Easy to deploy but lacks claim-level authorization and replay visibility.

## Required claims

All incoming service JWTs MUST include:

- `iss`: issuing service identifier (expected: `gs-api.edge` or configured equivalent)
- `aud`: target service audience (expected: `goldshore-core.internal`)
- `sub`: caller service identity (expected: `gs-api`)
- `scope`: space-delimited or array, must include operation scope (e.g. `core:read`, `core:write`)
- `iat`: issued-at epoch seconds
- `exp`: expiry epoch seconds

Optional but recommended:

- `jti`: unique token id for replay tracking
- `nbf`: not-before claim

## Token lifetime and skew

- **Default token TTL:** 120 seconds
- **Maximum accepted TTL:** 300 seconds
- **Clock skew tolerance:** +/- 30 seconds

Validation rules:

1. reject if `exp < now - skew`
2. reject if `iat > now + skew`
3. reject if `nbf > now + skew`
4. reject if `exp - iat` exceeds max TTL

## Replay protections

1. issue unique `jti` per forwarded request
2. persist seen `jti` values in short-lived store (TTL aligned to token `exp`)
3. reject duplicate `jti` during active window
4. emergency fallback: rotate shared secret and revoke all currently issued tokens

## Consequences

- We gain explicit, testable auth semantics across services.
- We accept temporary shared-secret blast radius while key management matures.
- Migration path to asymmetric JWT or mTLS remains open without changing claims contract.
