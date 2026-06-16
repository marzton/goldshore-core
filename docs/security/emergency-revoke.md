# Emergency Revoke Procedure for Service JWT Credentials

## Trigger conditions

- Secret leaked or accidentally committed.
- Suspicious token replay or unexpected caller identity.
- Upstream compromise requiring immediate trust reset.

## Immediate containment (target: < 15 minutes)

1. Mint and distribute replacement secret (`AUTH_SECRET_EMERGENCY`).
2. Deploy `goldshore-core` to accept only emergency secret.
3. Deploy `gs-api` to sign only with emergency secret.
4. Invalidate replay cache state and block old `jti` window.
5. Verify that old tokens fail with 401.

## Communication

- Notify security incident channel with timestamp and blast radius.
- Open incident ticket and attach deployment SHAs.

## Recovery follow-up

- Rotate again to normal secret versioning after incident stabilization.
- Complete root-cause analysis and prevent recurrence.
- Backfill audit report with failed/accepted auth events during incident window.
