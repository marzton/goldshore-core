# Key Rotation Runbook: `gs-api` <-> `goldshore-core` service JWT secret

## Rotation cadence

- Standard rotation every 30 days.
- Immediate rotation on suspected credential disclosure.

## Prerequisites

- Secure secret store access for both edge adapter and core verifier.
- Ability to deploy both services within the same maintenance window.

## Planned rotation (non-emergency)

1. Generate new 256-bit random secret (`AUTH_SECRET_NEXT`).
2. Deploy `goldshore-core` verifier with dual-secret support (`CURRENT` + `NEXT`) if available.
3. Deploy `gs-api` signer still on `CURRENT` (no traffic impact).
4. Switch `gs-api` signer to `NEXT`.
5. Observe auth error rates for 10 minutes.
6. Remove `CURRENT` from verifier.
7. Record rotation timestamp, operator, and secret version in security log.

## Post-rotation validation

- Confirm successful requests with valid `iss`, `aud`, `sub`, `scope`.
- Confirm rejects for invalid audience and expired token in CI integration suite.
- Confirm no sustained 401/403 increase in production telemetry.
